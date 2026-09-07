"""End-to-end check with REAL mlflow, scikit-learn and pandas, against a live tracking store.

`check_generated_code.py` fakes mlflow, which proves the call sequence but not that MLflow accepts
it. This runs the two halves for real - the injected save_model() writing an artifact, then the
Push To MLflow script logging and registering it - so run it where those libraries live, i.e. the
session container:

    sbt "customops/Test/runMain ai.deepsense.customops.DumpGeneratedCode /tmp/gen \
         src/test/python/sample_features_labels.py"
    docker cp /tmp/gen <sessionmanager>:/tmp/gen
    docker cp src/test/python/check_with_real_mlflow.py <sessionmanager>:/tmp/mlflow_check.py
    docker exec <sessionmanager> /opt/conda/bin/python /tmp/mlflow_check.py /tmp/gen
"""
import io
import json
import os
import shutil
import sys
import tempfile
import types


class Row(tuple):
    def __new__(cls, *a, **k):
        if a and all(isinstance(x, str) for x in a) and not k:
            f = list(a)

            def mk(*v):
                r = tuple.__new__(Row, v)
                r.__fields__ = f
                return r
            return mk
        return tuple.__new__(Row, a)

    def _asdict(self):
        return dict(zip(self.__fields__, self))


class SparkDF:
    def __init__(self, data):
        self.data, self.view = data, None

    def createOrReplaceGlobalTempView(self, name):
        self.view = name

    def dicts(self):
        return [r._asdict() if hasattr(r, "_asdict") else r for r in self.data]


pyspark = types.ModuleType("pyspark")
sql = types.ModuleType("pyspark.sql")
sql.Row, sql.DataFrame = Row, SparkDF
sys.modules["pyspark"], sys.modules["pyspark.sql"] = pyspark, sql
pyspark.sql = sql


class FakeSpark:
    def __init__(self):
        self.created = []            # the published frame is a local in the shim, not a global

    def createDataFrame(self, rows, schema=None):
        df = SparkDF(list(rows))
        self.created.append(df)
        return df

    def table(self, name):
        raise AssertionError("this check does not use input views")


def load(path, overrides=None):
    code = io.open(path, encoding="utf-8").read()
    g = {"spark": FakeSpark()}
    exec(compile(code, path, "exec"), g)
    g.update(overrides or {})
    return g


def main():
    gen = sys.argv[1]
    import mlflow
    import pandas as pd
    from sklearn.ensemble import RandomForestClassifier

    work = tempfile.mkdtemp(prefix="sh-mlflow-check-")
    tracking = "sqlite:///" + os.path.join(work, "mlflow.db")
    os.environ["MLFLOW_TRACKING_URI"] = tracking
    os.environ["SEAHORSE_MODEL_DIR"] = os.path.join(work, "models")
    try:
        # ---- half 1: the injected save_model(), as a training node would call it ----
        g = load(os.path.join(gen, "gen_1to2.py"))
        frame = pd.DataFrame({"arpu": [1.0, 2.0, 3.0, 4.0], "calls": [1, 2, 3, 4]})
        labels = [0, 1, 0, 1]
        model = RandomForestClassifier(n_estimators=5, random_state=0).fit(frame, labels)

        saved = g["save_model"](model, metrics={"auc": 0.83}, params={"n_estimators": 5})
        print("save_model() wrote:", saved)
        assert os.path.isfile(os.path.join(saved, "MLmodel")), "no MLmodel file"
        print("  MLmodel present, so MLflow can load it back")

        spark = g["spark"]
        g["_sh_publish_model"](spark)
        published = [df for df in spark.created if df.view]
        assert published, "the model record was not published to a view"
        record = published[-1]
        print("  published to view:", record.view)
        row = record.dicts()[0]
        print("  published record:", {k: row[k] for k in ("flavor", "model_path")})
        assert row["flavor"] == "sklearn", row
        assert json.loads(row["metrics_json"]) == {"auc": 0.83}, row

        # ---- half 2: the Push To MLflow script, fed by that record ----
        push = load(os.path.join(gen, "gen_mlflow_push.py"), overrides={
            "_SH_TRACKING_URI": tracking,
            "_SH_EXPERIMENT": "seahorse-e2e-check",
            "_SH_RUN_NAME": "e2e",
            "_SH_REGISTER_AS": "e2e-churn",
            "_SH_MODEL_PATH": row["model_path"],
            "_SH_MODEL_FLAVOR": row["flavor"],
            "_SH_METRICS_JSON": row["metrics_json"],
            "_SH_PARAMS_JSON": row["params_json"],
        })
        result = push["transform"](SparkDF([]))
        out = result.dicts()[0]
        print()
        print("Push To MLflow returned:")
        for key in ("run_id", "experiment_id", "model_uri", "registered_model",
                    "model_version", "tracking_uri"):
            print("  %-18s %s" % (key, out[key]))

        # ---- verify against MLflow itself, not just the node's own report ----
        mlflow.set_tracking_uri(tracking)
        client = mlflow.MlflowClient(tracking_uri=tracking)
        run = client.get_run(out["run_id"])
        print()
        print("read back from MLflow:")
        print("  metrics          ", dict(run.data.metrics))
        print("  params           ", dict(run.data.params))
        assert run.data.metrics.get("auc") == 0.83, run.data.metrics
        assert run.data.params.get("n_estimators") == "5", run.data.params

        artifacts = [f.path for f in client.list_artifacts(out["run_id"], "model")]
        print("  logged artifacts ", sorted(artifacts)[:4], "...")
        assert any(a.endswith("MLmodel") for a in artifacts), artifacts

        versions = client.search_model_versions("name='e2e-churn'")
        print("  registry versions", [(v.name, v.version) for v in versions])
        assert versions, "the model was not registered"

        loaded = mlflow.pyfunc.load_model(out["model_uri"])
        preds = loaded.predict(frame)
        print("  loaded via pyfunc and predicted:", list(preds))
        assert len(preds) == 4

        print()
        print("ALL REAL-MLFLOW CHECKS PASSED")
    finally:
        shutil.rmtree(work, ignore_errors=True)


if __name__ == "__main__":
    main()
