"""Runs a generated script with REAL pandas/numpy and a stubbed pyspark.

`check_generated_code.py` fakes pandas, which is enough for the object-conversion rules but cannot
exercise the pandas-specific paths: a returned Series, a numpy array, and the guard that stops
pandas/numpy objects being scraped for attributes as if they were rows. Those need the real
libraries, so run this wherever pandas lives - the session container:

    sbt "customops/Test/runMain ai.deepsense.customops.DumpGeneratedCode /tmp/gen \
         src/test/python/sample_features_labels.py"
    docker cp /tmp/gen/gen_1to2.py <sessionmanager>:/tmp/gen_1to2.py
    docker cp src/test/python/check_with_real_pandas.py <sessionmanager>:/tmp/harness.py
    docker exec <sessionmanager> /opt/conda/bin/python /tmp/harness.py /tmp/gen_1to2.py

The script it expects is the 1 To 2 one generated from sample_features_labels.py.
"""
import sys, types
import pandas as pd
import numpy as np


class Row(tuple):
    def __new__(cls, *a, **k):
        if a and all(isinstance(x, str) for x in a) and not k:
            f = list(a)
            def mk(*v):
                r = tuple.__new__(Row, v); r.__fields__ = f; return r
            return mk
        return tuple.__new__(Row, a)
    def _asdict(self): return dict(zip(self.__fields__, self))


class SparkDF:
    def __init__(self, data, schema=None):
        self.data, self.schema, self.view = data, schema, None
    def createOrReplaceGlobalTempView(self, name): self.view = name


pyspark = types.ModuleType("pyspark"); sql = types.ModuleType("pyspark.sql")
sql.Row, sql.DataFrame = Row, SparkDF
sys.modules["pyspark"], sys.modules["pyspark.sql"] = pyspark, sql
pyspark.sql = sql


class FakeSpark:
    def createDataFrame(self, data, schema=None): return SparkDF(data, schema)
    def table(self, name): return InputDF()


class InputDF:
    """Stands in for the Spark input DataFrame the executor hands to transform()."""
    def toPandas(self):
        return pd.DataFrame({
            "msisdn": ["9111", "9222", "9333"],
            "date": ["2026-01-01", "2026-01-02", "2026-01-03"],
            "churn": [0, 1, 0],
            "arpu": [210.5, 88.0, 340.25],
            "calls": [12, 3, 40],
        })


code = open(sys.argv[1]).read()
g = {"spark": FakeSpark()}
exec(compile(code, sys.argv[1], "exec"), g)

out0 = g["transform"](InputDF())

print("port 0 type   :", type(out0).__module__ + "." + type(out0).__name__)
assert isinstance(out0, pd.DataFrame), "port 0 should be the features pandas DataFrame"
print("port 0 columns:", list(out0.columns))
print("port 0 rows   :", len(out0))
assert list(out0.columns) == ["arpu", "calls"], list(out0.columns)

published = [v for v in g.values() if isinstance(v, SparkDF) and v.view]
# the shim published port 1 through spark.createDataFrame(pandas_frame)
print()
print("THE FIX: y (a pandas Series) is now handled. Checking directly:")
y = InputDF().toPandas()["churn"]
frame = g["_sh_series_to_frame"](y)
print("  Series name      :", repr(y.name))
print("  -> frame columns :", list(frame.columns), "| rows:", len(frame))
assert list(frame.columns) == ["churn"] and len(frame) == 3

unnamed = pd.Series([1, 2])
uf = g["_sh_series_to_frame"](unnamed)
print("  unnamed Series   -> columns:", list(uf.columns), "(not the integer 0 Spark rejects)")
assert list(uf.columns) == ["value"], list(uf.columns)

print("  Series is no longer mistaken for a row object:",
      g["_sh_as_mapping"](y) is None)
assert g["_sh_as_mapping"](y) is None
assert g["_sh_as_mapping"](InputDF().toPandas()) is None

print()
print("numpy arrays:")
a1 = np.array([0, 1, 0])
r1 = g["_sh_to_dataframe"](a1, FakeSpark())
print("  1-D ndarray -> rows:", r1.data)
assert r1.data == [(0,), (1,), (0,)], r1.data
a2 = np.array([[1.0, 2.0], [3.0, 4.0]])
r2 = g["_sh_to_dataframe"](a2, FakeSpark())
print("  2-D ndarray -> rows:", r2.data)
assert r2.data == [(1.0, 2.0), (3.0, 4.0)], r2.data

print()
print("second output forced to Spark (it must be view-publishable):")
sp = g["_sh_to_spark_dataframe"](y, FakeSpark())
print("  Series -> ", type(sp).__name__, "wrapping", type(sp.data).__name__,
      list(sp.data.columns))
assert isinstance(sp, SparkDF) and list(sp.data.columns) == ["churn"]

print()
print("ALL REAL-PANDAS CHECKS PASSED")
