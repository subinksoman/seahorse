"""Full loop with real MLflow and sklearn: train -> save_model -> Push To MLflow -> register
-> MLflow Predict by registry name, version and alias.

Needs real mlflow/sklearn, so it runs where they live - the session container:

    sbt "customops/Test/runMain ai.deepsense.customops.DumpGeneratedCode /tmp/gen"
    docker cp /tmp/gen <sessionmanager>:/tmp/gen
    docker cp src/test/python/check_predict_with_real_mlflow.py <sessionmanager>:/tmp/c.py
    docker exec <sessionmanager> /opt/conda/bin/python /tmp/c.py /tmp/gen
"""
import io, os, re, shutil, sys, tempfile, types, warnings

os.environ["GIT_PYTHON_REFRESH"] = "quiet"
warnings.filterwarnings("ignore")
import pandas as pd
from sklearn.linear_model import LogisticRegression


class Row(tuple):
    def __new__(cls, *a, **k):
        if a and all(isinstance(x, str) for x in a) and not k:
            f = list(a)
            def mk(*v):
                r = tuple.__new__(Row, v); r.__fields__ = f; return r
            return mk
        return tuple.__new__(Row, a)
    def _asdict(self): return dict(zip(self.__fields__, self))
    def asDict(self, recursive=False): return self._asdict()


class SparkDF:
    """Stands in for the Spark DataFrame the executor hands a node."""
    def __init__(self, rows=(), pdf=None):
        self.rows, self.pdf, self.view = list(rows), pdf, None
    def createOrReplaceGlobalTempView(self, name): self.view = name
    def toPandas(self): return self.pdf
    def collect(self): return self.rows
    def dicts(self): return [r._asdict() for r in self.rows]


m = types.ModuleType("pyspark"); sql = types.ModuleType("pyspark.sql")
sql.Row, sql.DataFrame = Row, SparkDF
sys.modules["pyspark"], sys.modules["pyspark.sql"] = m, sql; m.sql = sql


class FS:
    def __init__(self): self.created = []
    def createDataFrame(self, rows, schema=None):
        df = SparkDF(rows if isinstance(rows, list) else [])
        self.created.append(df); return df


def load(path, spark=None):
    g = {"spark": spark or FS()}
    exec(compile(io.open(path).read(), path, "exec"), g)
    return g


def retarget(path, **literals):
    """Rewrite the generated `_SH_*` literals, standing in for the node's parameters."""
    code = io.open(path).read()
    for key, value in literals.items():
        code = re.sub(r"^%s = .*$" % key, '%s = %r' % (key, value), code, flags=re.M)
    out = path + ".retargeted"
    io.open(out, "w").write(code)
    return out


gen = sys.argv[1]
work = tempfile.mkdtemp()
os.environ["SEAHORSE_MODEL_DIR"] = os.path.join(work, "models")
tracking = "sqlite:///" + os.path.join(work, "mlflow.db")
# The operations read MLFLOW_TRACKING_URI from the environment, so the test must too.
os.environ["MLFLOW_TRACKING_URI"] = tracking
try:
    import mlflow
    from mlflow import MlflowClient

    X = pd.DataFrame({"arpu": [10.0, 90.0, 20.0, 80.0, 30.0, 70.0],
                      "calls": [1, 40, 3, 35, 5, 30]})
    y = [0, 1, 0, 1, 0, 1]
    # The frame a real workflow scores still carries the label and an id column.
    scored = X.assign(churn=y, msisdn=list("abcdef"))

    # 1. training node: save_model with an input_example so a signature is recorded
    train = load(os.path.join(gen, "gen_1to2.py"))
    model = LogisticRegression(max_iter=200).fit(X, y)
    saved = train["save_model"](
        model,
        metrics={"accuracy": float(model.score(X, y))},
        params=model.get_params(),
        input_example=X)
    train["_sh_publish_model"](train["spark"])
    record = [d for d in train["spark"].created if d.view][-1].dicts()[0]
    print("1. save_model  ->", record["flavor"], "|", os.path.basename(saved))

    # 2. Push To MLflow: log the run and register it
    push_path = retarget(os.path.join(gen, "gen_mlflow_push.py"),
                         _SH_MODEL_PATH=record["model_path"],
                         _SH_MODEL_FLAVOR=record["flavor"],
                         _SH_METRICS_JSON=record["metrics_json"],
                         _SH_PARAMS_JSON=record["params_json"],
                         _SH_REGISTER_AS="churn-model")
    push = load(push_path)
    result = push["transform"](SparkDF(rows=[Row(unused="x")])).dicts()[0]
    print("2. pushed      -> version", result["model_version"], "|", result["model_uri"])
    # experiment = model name, run = model name + timestamp
    assert result["experiment"] == "churn-model", result["experiment"]
    assert re.fullmatch(r"churn-model-\d{8}-\d{6}", result["run_name"]), result["run_name"]
    from mlflow import MlflowClient as _C
    run = _C(tracking).get_run(result["run_id"])
    assert run.data.tags.get("mlflow.runName") == result["run_name"], run.data.tags
    exp = _C(tracking).get_experiment(result["experiment_id"])
    assert exp.name == "churn-model", exp.name
    print("   experiment  ->", exp.name, "(groups every push of this model)")
    print("   run name    ->", run.data.tags.get("mlflow.runName"), "(read back from MLflow)")

    MlflowClient(tracking).set_registered_model_alias("churn-model", "champion",
                                                      result["model_version"])

    # 3. MLflow Predict: by latest, by explicit version, and by alias
    for label, version in [("latest", ""), ("version 1", "1"), ("alias champion", "champion")]:
        p = retarget(os.path.join(gen, "gen_mlflow_predict.py"),
                     _SH_MODEL_NAME="churn-model", _SH_MODEL_VERSION=version,
                     )
        g = load(p)
        out = g["transform"](SparkDF(pdf=scored))
        assert isinstance(out, pd.DataFrame), type(out)
        assert list(out.columns) == ["prediction"], list(out.columns)
        assert len(out) == len(scored)
        print("3. predict %-15s -> cols %s | prediction %s" % (
            label, list(out.columns), list(out["prediction"])))

    # 4. a model that does not exist must say so clearly
    p = retarget(os.path.join(gen, "gen_mlflow_predict.py"),
                 _SH_MODEL_NAME="no-such-model", _SH_MODEL_VERSION="",
                 )
    try:
        load(p)["transform"](SparkDF(pdf=scored))
        raise AssertionError("should have failed")
    except Exception as e:
        assert "no model at" in str(e), str(e)
        print("4. missing model -> %s" % str(e).split("(")[0].strip())

    # 5. a model returning several columns gets prediction_0, prediction_1, ...
    frame = g["_sh_predictions_frame"]([[0.1, 0.9], [0.8, 0.2]])
    assert list(frame.columns) == ["prediction_0", "prediction_1"], list(frame.columns)
    print("5. multi-column output -> %s" % list(frame.columns))

    print()
    print("ALL PREDICT E2E CHECKS PASSED")
finally:
    shutil.rmtree(work, ignore_errors=True)
