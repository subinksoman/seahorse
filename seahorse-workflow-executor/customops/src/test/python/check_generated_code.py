"""Checks the Python that the SixDee Python transformations submit to the session.

The shim has to satisfy `code_executor.py` exactly (a top-level one-argument `transform`) and turn
whatever the user's two-argument `transform` returns into Spark rows. Both are cheap to get wrong
and expensive to discover on a cluster, so pyspark is faked and the whole thing runs offline:

    sbt "customops/Test/runMain ai.deepsense.customops.DumpGeneratedCode /tmp/gen"
    python3 src/test/python/check_generated_code.py /tmp/gen
"""

import ast
import dataclasses
import io
import json
import os
import shutil
import sys
import tempfile
import types
from collections import namedtuple


# --- fake pyspark -----------------------------------------------------------------------------

class Row(tuple):
    def __new__(cls, *args, **kw):
        if args and all(isinstance(a, str) for a in args) and not kw:
            fields = list(args)                      # Row('a','b') -> row factory

            def factory(*vals):
                r = tuple.__new__(Row, vals)
                r.__fields__ = fields
                return r
            return factory
        if kw:
            r = tuple.__new__(Row, kw.values())
            r.__fields__ = list(kw)
            return r
        return tuple.__new__(Row, args)

    def _asdict(self):
        return dict(zip(self.__fields__, self))

    def __repr__(self):
        try:
            return "Row(%s)" % ", ".join("%s=%r" % kv for kv in self._asdict().items())
        except AttributeError:
            return tuple.__repr__(self)


class FakeDataFrame:
    """Stands in for a Spark DataFrame: remembers its rows, schema and published view name."""

    def __init__(self, rows=(), schema=None, n=0):
        self.rows = list(rows)
        self.schema = schema
        self.view = None
        self._n = n

    def count(self):
        return self._n or len(self.rows)

    def createOrReplaceGlobalTempView(self, name):
        self.view = name

    def dicts(self):
        return [r._asdict() if hasattr(r, "_asdict") else r for r in self.rows]


class FakePandasDataFrame:
    """Only needs to be distinguishable; real pandas frames are accepted by createDataFrame."""

    def __init__(self, columns=()):
        self.columns = list(columns)


class FakePandasSeries:
    """Enough of a Series for the shim: a name, reset_index and to_frame."""

    def __init__(self, values=(), name=None):
        self.values, self.name = list(values), name

    def reset_index(self, drop=False):
        return self

    def to_frame(self, name=None):
        return FakePandasDataFrame([name if name is not None else self.name])


# The shim identifies pandas/numpy objects by their defining module, so the fakes must claim it -
# that is what stops a Series being scraped for attributes as if it were a row.
FakePandasDataFrame.__module__ = "pandas.core.frame"
FakePandasSeries.__module__ = "pandas.core.series"


def install_fake_pyspark():
    pyspark = types.ModuleType("pyspark")
    sql = types.ModuleType("pyspark.sql")
    sql.Row = Row
    sql.DataFrame = FakeDataFrame
    functions = types.ModuleType("pyspark.sql.functions")
    sql.functions = functions
    pyspark.sql = sql
    sys.modules["pyspark"] = pyspark
    sys.modules["pyspark.sql"] = sql
    sys.modules["pyspark.sql.functions"] = functions

    pandas = types.ModuleType("pandas")
    pandas.DataFrame = FakePandasDataFrame
    pandas.Series = FakePandasSeries
    sys.modules["pandas"] = pandas


class FakeMlflowFlavor:
    def __init__(self, name, saved, signatures=None):
        self.name, self.saved = name, saved
        self.signatures = signatures if signatures is not None else []

    def save_model(self, model, path, signature=None):
        self.saved.append((self.name, type(model).__name__, path))
        self.signatures.append(signature)
        os.makedirs(path, exist_ok=True)
        io.open(os.path.join(path, "MLmodel"), "w").write("flavor: %s\n" % self.name)


class FakePyfunc:
    """pyfunc's save_model is keyword-only (path=, python_model=), unlike the flavours."""

    PythonModel = type("PythonModel", (), {})

    def __init__(self, saved, signatures=None):
        self.saved, self.signatures = saved, signatures if signatures is not None else []

    def save_model(self, path=None, python_model=None, signature=None):
        self.saved.append(("pyfunc", type(python_model).__name__, path))
        os.makedirs(path, exist_ok=True)
        io.open(os.path.join(path, "MLmodel"), "w").write("flavor: pyfunc\n")

    def load_model(self, path):
        raise AssertionError("not used by these checks")


class FakeRun:
    class info:
        run_id = "run-abc123"
        experiment_id = "7"

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False


class FakeMlflowModule(types.ModuleType):
    """Records every call the generated script makes, so the checks can assert on them."""

    def __init__(self):
        types.ModuleType.__init__(self, "mlflow")
        self.calls = []
        self.saved = []
        self.signatures = []
        self.tracking_uri = "file:///default"
        for flavor in ("sklearn", "xgboost", "lightgbm", "pytorch", "tensorflow", "spark"):
            setattr(self, flavor, FakeMlflowFlavor(flavor, self.saved, self.signatures))
        self.pyfunc = FakePyfunc(self.saved, self.signatures)

    def set_tracking_uri(self, uri):
        self.tracking_uri = uri
        self.calls.append(("set_tracking_uri", uri))

    def get_tracking_uri(self):
        return self.tracking_uri

    def set_experiment(self, name):
        self.calls.append(("set_experiment", name))

    def start_run(self, run_name=None):
        self.calls.append(("start_run", run_name))
        return FakeRun()

    def log_params(self, params):
        self.calls.append(("log_params", dict(params)))

    def log_metrics(self, metrics):
        self.calls.append(("log_metrics", dict(metrics)))

    def set_tag(self, key, value):
        self.calls.append(("set_tag", key, value))

    def set_tags(self, tags):
        self.calls.append(("set_tags", dict(tags)))

    def log_artifacts(self, path, artifact_path=None):
        self.calls.append(("log_artifacts", path, artifact_path))

    def register_model(self, uri, name):
        self.calls.append(("register_model", uri, name))
        return type("MV", (), {"version": 3})()


def install_fake_mlflow():
    module = FakeMlflowModule()
    sys.modules["mlflow"] = module
    return module


class FakeSpark:
    def __init__(self):
        self.tables = {}
        self.requested = []
        self.last_created = []
        self.last_created_df = None

    def createDataFrame(self, rows, schema=None):
        if isinstance(rows, FakePandasDataFrame):
            df = FakeDataFrame([], schema)
            df.from_pandas = True
        else:
            df = FakeDataFrame(rows, schema)
        self.last_created.append(df)
        self.last_created_df = df
        return df

    def table(self, name):
        self.requested.append(name)
        return self.tables.get(name, FakeDataFrame(n=7))


# --- helpers ----------------------------------------------------------------------------------

def load(path):
    """Exec one generated script the way code_executor.py does, after its own isValid() check."""
    code = io.open(path, encoding="utf-8").read()
    parsed = ast.parse(code)                                     # syntax

    def is_transform(f):
        return (isinstance(f, ast.FunctionDef) and f.name == "transform"
                and len(f.args.args) in [1])                     # code_executor's ARITIES
    assert any(is_transform(f) for f in parsed.body), \
        "%s: code_executor.isValid() would REJECT this" % path
    spark = FakeSpark()
    g = {"spark": spark}
    exec(compile(code, path, "exec"), g)
    return g, spark, code


def expect_error(fn, want, label):
    try:
        fn()
    except Exception as exc:                                     # noqa: BLE001 - that's the point
        assert want in str(exc), "%s: wanted %r in %r" % (label, want, str(exc))
        return str(exc)
    raise AssertionError("%s: expected an error, got none" % label)


class Obj:
    def __init__(self, **kw):
        self.__dict__.update(kw)
        self._internal = "hidden"


@dataclasses.dataclass
class Hit:
    key: str
    score: float


# --- the conversion contract (shared by both operations) --------------------------------------

def check_conversion(g, label):
    to_df = g["_sh_to_dataframe"]
    fs = FakeSpark()

    r = to_df([Hit("a", 1.0), Hit("b", 2.0)], fs)
    assert r.dicts() == [{"key": "a", "score": 1.0}, {"key": "b", "score": 2.0}], r.dicts()
    print("  OK  list of dataclasses ->", r.rows)

    r = to_df([Obj(a=1, b=2), Obj(a=3, c=4)], fs)
    assert r.dicts() == [{"a": 1, "b": 2, "c": None}, {"a": 3, "b": None, "c": 4}], r.dicts()
    print("  OK  ragged plain objects (union of keys, privates dropped) ->", r.rows)

    NT = namedtuple("NT", "x y")
    r = to_df([NT(1, Obj(deep=9))], fs)
    assert r.rows[0]._asdict()["y"]._asdict() == {"deep": 9}, r.rows
    print("  OK  namedtuple + nested object -> struct ->", r.rows)

    # Regression: nested objects with different key sets per row used to produce structs of
    # different arity. Spark infers the schema from row 0 and applies it to the rest, so the
    # mismatch surfaced as STRUCT_ARRAY_LENGTH_MISMATCH in whatever downstream stage first
    # computed the DataFrame - never in the node that made it.
    r = to_df([{"a": 1, "n": {"x": 1, "y": 2}},
               {"a": 2, "n": {"x": 9}},
               {"a": 3, "n": None}], fs)
    nested = [row._asdict()["n"] for row in r.rows]
    arities = [len(n.__fields__) for n in nested if n is not None]
    assert len(set(arities)) == 1 and arities[0] == 2, [n and n._asdict() for n in nested]
    assert nested[1]._asdict() == {"x": 9, "y": None}, nested[1]._asdict()
    assert nested[2] is None, nested[2]
    print("  OK  ragged NESTED objects padded to one struct shape ->",
          [n and n._asdict() for n in nested])

    # Same hazard inside lists: elements must share a shape too.
    r = to_df([{"items": [{"p": 1, "q": 2}]}, {"items": [{"p": 3}]}], fs)
    elems = [row._asdict()["items"][0] for row in r.rows]
    assert len({len(e.__fields__) for e in elems}) == 1, [e._asdict() for e in elems]
    print("  OK  ragged objects inside lists padded too ->", [e._asdict() for e in elems])

    # Deeper nesting must recurse.
    r = to_df([{"n": {"m": {"a": 1, "b": 2}}}, {"n": {"m": {"a": 5}}}], fs)
    deep = [row._asdict()["n"]._asdict()["m"] for row in r.rows]
    assert len({len(d.__fields__) for d in deep}) == 1, [d._asdict() for d in deep]
    print("  OK  two levels deep ->", [d._asdict() for d in deep])

    assert to_df({"only": 1}, fs).dicts() == [{"only": 1}]
    print("  OK  single dict -> one row")

    assert to_df([(1, "a"), (2, "b")], fs).rows == [(1, "a"), (2, "b")]
    assert to_df([1, 2, 3], fs).rows == [(1,), (2,), (3,)]
    print("  OK  list of tuples / list of scalars")

    df = FakeDataFrame([Row(z=1)])
    assert to_df(df, fs) is df
    print("  OK  Spark DataFrame passes through untouched")

    pdf = FakePandasDataFrame(["arpu", "calls"])
    assert to_df(pdf, fs) is pdf
    print("  OK  pandas DataFrame passes through (executor's Arrow path handles it)")

    # Regression: a pandas Series used to be scraped for attributes as if it were a row object,
    # yielding zero fields and "have no readable fields" - the `return X, y` failure.
    assert g["_sh_as_mapping"](FakePandasSeries([0, 1], name="churn")) is None
    assert g["_sh_as_mapping"](pdf) is None
    named = to_df(FakePandasSeries([0, 1, 0], name="churn"), fs)
    assert named.columns == ["churn"], named.columns
    unnamed = to_df(FakePandasSeries([1, 2]), fs)
    assert unnamed.columns == ["value"], unnamed.columns
    print("  OK  pandas Series -> one-column frame ('churn'; unnamed becomes 'value')")

    msg = expect_error(lambda: to_df([], fs), "empty list", label)
    assert "return a Spark DataFrame instead of a list" in msg, msg
    expect_error(lambda: to_df(None, fs), "returned None", label)
    expect_error(lambda: to_df("nope", fs), "must be a list", label)
    print("  OK  empty list / None / wrong type all give actionable errors")

    chk = g["_sh_check_arity"]
    for n, ok, bad in [(1, [lambda a: None], [lambda: None, lambda a, b: None]),
                       (2, [lambda a, b: None], [lambda a: None, lambda a, b, c: None])]:
        for f in ok:
            chk(f, n, "transform(...)")
        chk(lambda *a: None, n, "transform(...)")           # *args always allowed
        for f in bad:
            expect_error(lambda f=f, n=n: chk(f, n, "transform(...)"),
                         "must take exactly " + str(n), label)
    print("  OK  arity guard: per-operation arity enforced, *args always allowed")


# --- per-script checks ------------------------------------------------------------------------

def check_2to1(path):
    print("== %s" % os.path.basename(path))
    g, spark, _ = load(path)
    print("  OK  syntax + code_executor.isValid() accepts")

    spark.tables["global_temp.seahorse_py_in1_aa_bb_11"] = FakeDataFrame(n=7)

    # The shipped default is the identity `return df1`, so an unedited node runs and passes the
    # left input straight through - the same convention as the built-in Python Transformation.
    left = FakeDataFrame(n=3)
    out = g["transform"](left)
    assert out is left, "the identity default must pass the left input through untouched"
    assert spark.requested == ["global_temp.seahorse_py_in1_aa_bb_11"], spark.requested
    print("  OK  df2 read from the in1 view; the identity default returns df1 unchanged")

    joined = FakeDataFrame([Row(id=1)])
    g["_sh_user_transform"] = lambda df1, df2: joined
    out = g["transform"](FakeDataFrame(n=3))
    assert out is joined, "a returned Spark DataFrame must pass through untouched"
    print("  OK  a returned Spark DataFrame passes through as output port 0")
    check_conversion(g, path)



def check_two_outputs(path, arity):
    print("== %s" % os.path.basename(path))
    g, spark, _ = load(path)
    print("  OK  syntax + code_executor.isValid() accepts")

    # The shipped defaults are identities too (`return df, df` / `return df1, df2`), so an
    # unedited node runs rather than erroring.
    if arity == 1:
        only = FakeDataFrame(n=3)
        assert g["transform"](only) is only, "the 1-input identity default must pass through"
        print("  OK  identity default runs unedited")
    else:
        spark.tables["global_temp.seahorse_py_in1_aa_bb_11"] = FakeDataFrame(n=7)
        left = FakeDataFrame(n=3)
        assert g["transform"](left) is left, "the 2-input identity default must pass through"
        print("  OK  identity default runs unedited")
    spark.requested = []

    first, second = FakeDataFrame([Row(a=1)]), FakeDataFrame([Row(b=2)])
    # Stand-ins must take exactly `arity` positional args or the arity guard fires first.
    def pair(value):
        return (lambda df1, df2: value) if arity == 2 else (lambda df: value)
    g["_sh_user_transform"] = pair((first, second))

    out0 = g["transform"](FakeDataFrame(n=3))
    # A one-input operation must not look for a right-hand input view at all.
    expected_views = ["global_temp.seahorse_py_in1_aa_bb_11"] if arity == 2 else []
    assert spark.requested == expected_views, spark.requested
    assert out0 is first, "output port 0 must be returned through the normal channel"
    assert second.view == "seahorse_py_out1_aa_bb_11", second.view
    print("  OK  port 0 returned normally; port 1 published as view %r" % second.view)

    # each output is converted independently
    g["_sh_user_transform"] = pair(([{"a": 1}], [{"b": 2}, {"b": 3}]))
    spark.requested = []
    out0 = g["transform"](FakeDataFrame(n=3))
    assert out0.dicts() == [{"a": 1}], out0.dicts()
    print("  OK  two lists of objects -> two DataFrames ->", out0.rows)

    # the ambiguous case must be refused, not guessed
    g["_sh_user_transform"] = pair(({"a": 1}, {"b": 2}))
    msg = expect_error(lambda: g["transform"](FakeDataFrame(n=1)),
                       "ambiguous", path)
    assert "return [row_a], [row_b]" in msg, msg
    print("  OK  two bare row objects refused as ambiguous:", msg.split(":")[0] + "...")

    for bad, want in [((1, 2, 3), "exactly 2 values"), ((1,), "exactly 2 values"),
                      (FakeDataFrame(), "a single FakeDataFrame")]:
        g["_sh_user_transform"] = pair(bad)
        expect_error(lambda: g["transform"](FakeDataFrame(n=1)), want, path)
    print("  OK  wrong arity of return value (3, 1, not-a-pair) all rejected clearly")

    # a pandas second output must be forced to Spark - it has to be publishable as a view
    force = g["_sh_to_spark_dataframe"]
    r = force(FakePandasDataFrame(), FakeSpark())
    assert isinstance(r, FakeDataFrame) and getattr(r, "from_pandas", False), type(r)
    print("  OK  pandas second output forced to a real Spark DataFrame (view-publishable)")

    check_conversion(g, path)


class FakeSklearnModel:
    """Its __module__ is what the flavour detection keys on."""


FakeSklearnModel.__module__ = "sklearn.ensemble._forest"


def check_save_model(path):
    """The injected save_model() must write the artifact and publish the record to the model view."""
    print("== save_model injection (%s)" % os.path.basename(path))
    mlflow = install_fake_mlflow()
    g, spark, _ = load(path)
    workdir = tempfile.mkdtemp()
    try:
        target = os.path.join(workdir, "model")
        returned = g["save_model"](
            FakeSklearnModel(), metrics={"auc": 0.83}, params={"n_estimators": 100}, path=target)
        assert returned == target, returned
        assert mlflow.saved == [("sklearn", "FakeSklearnModel", target)], mlflow.saved
        print("  OK  flavour auto-detected from the model's module -> mlflow.sklearn.save_model")

        g["_sh_publish_model"](spark)
        published = [v for v in (spark.last_created or []) if True]
        record = spark.last_created_df
        assert record is not None and record.view == "seahorse_py_model_aa_bb_11", record
        row = record.dicts()[0]
        assert row["model_path"] == target and row["flavor"] == "sklearn", row
        assert json.loads(row["metrics_json"]) == {"auc": 0.83}, row
        assert json.loads(row["params_json"]) == {"n_estimators": 100}, row
        print("  OK  record published to the model view:", record.view)

        # An explicit flavour wins, and an unknown one is refused with a usable message.
        g["save_model"](FakeSklearnModel(), flavor="xgboost", path=os.path.join(workdir, "x"))
        assert mlflow.saved[-1][0] == "xgboost", mlflow.saved[-1]
        expect_error(lambda: g["save_model"](FakeSklearnModel(), flavor="nope",
                                             path=os.path.join(workdir, "n")),
                     "no 'nope' flavour", path)
        print("  OK  explicit flavour honoured; unknown flavour refused")

        # Any object is savable: an unrecognised type falls back to the pyfunc flavour rather
        # than being refused.
        class Mystery:
            def predict(self, frame):
                return [1] * len(frame)
        g["save_model"](Mystery(), path=os.path.join(workdir, "any"))
        assert mlflow.saved[-1][0] == "pyfunc", mlflow.saved[-1]
        print("  OK  unrecognised object -> pyfunc flavour (any object is savable)")
    finally:
        shutil.rmtree(workdir, ignore_errors=True)

    # A node that never calls save_model must leave the port empty, not fail.
    g2, spark2, _ = load(path)
    g2["_sh_publish_model"](spark2)
    assert spark2.last_created_df is None, "nothing should be published without save_model()"
    print("  OK  no save_model() call -> nothing published (model port stays empty)")


def check_mlflow_push(path):
    print("== %s" % os.path.basename(path))
    mlflow = install_fake_mlflow()
    g, spark, _ = load(path)
    print("  OK  syntax + code_executor.isValid() accepts")

    workdir = tempfile.mkdtemp()
    try:
        model_dir = "/library/seahorse-models/wf-42/aa-bb-11"
        # The script checks the real filesystem, so stand the directory up where it expects it.
        expect_error(lambda: g["transform"](FakeDataFrame()), "not visible to the executor", path)
        print("  OK  a missing model directory fails with an actionable message")

        os.makedirs(os.path.join(workdir, "m"), exist_ok=True)
        g["_SH_MODEL_PATH"] = os.path.join(workdir, "m")
        expect_error(lambda: g["transform"](FakeDataFrame()), "has no MLmodel file", path)
        print("  OK  a directory without MLmodel is refused (a bare pickle is not a model)")

        io.open(os.path.join(workdir, "m", "MLmodel"), "w").write("flavor: sklearn\n")
        out = g["transform"](FakeDataFrame())
        row = out.dicts()[0]
        assert row["run_id"] == "run-abc123", row
        assert row["model_uri"] == "runs:/run-abc123/model", row
        assert row["registered_model"] == "churn" and row["model_version"] == "3", row
        print("  OK  logged and registered ->", {k: row[k] for k in
              ("run_id", "model_uri", "registered_model", "model_version")})

        kinds = [c[0] for c in mlflow.calls]
        for expected in ("set_experiment", "start_run", "log_params", "log_metrics",
                         "log_artifacts", "register_model"):
            assert expected in kinds, (expected, kinds)
        artifacts = [c for c in mlflow.calls if c[0] == "log_artifacts"]
        assert artifacts[0][2] == "model", artifacts
        metrics = [c for c in mlflow.calls if c[0] == "log_metrics"][0][1]
        assert metrics == {"auc": 0.83}, metrics
        params = [c for c in mlflow.calls if c[0] == "log_params"][0][1]
        assert params == {"n_estimators": "100"}, params
        print("  OK  MLflow call sequence:", " -> ".join(
            k for k in kinds if k != "set_tag"))

        # Non-numeric metrics must be caught before MLflow rejects them.
        g["_SH_METRICS_JSON"] = json.dumps({"auc": "not-a-number"})
        expect_error(lambda: g["transform"](FakeDataFrame()), "not numeric", path)
        print("  OK  non-numeric metrics rejected with the offending names")
    finally:
        shutil.rmtree(workdir, ignore_errors=True)


def main():
    install_fake_pyspark()
    d = sys.argv[1]
    check_2to1(os.path.join(d, "gen_2to1.py"))
    check_two_outputs(os.path.join(d, "gen_2to2.py"), arity=2)
    check_two_outputs(os.path.join(d, "gen_1to2.py"), arity=1)
    check_save_model(os.path.join(d, "gen_1to2.py"))
    check_mlflow_push(os.path.join(d, "gen_mlflow_push.py"))
    print("\nALL CHECKS PASSED")


if __name__ == "__main__":
    main()
