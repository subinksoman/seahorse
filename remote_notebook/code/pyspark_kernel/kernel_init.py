# Copyright 2016 deepsense.ai (CodiLime, Inc)
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.

import os
import sys
import tempfile
import warnings

from pyspark import SparkContext, SparkConf
from pyspark.sql import SQLContext, DataFrame
from py4j.java_gateway import JavaGateway, GatewayParameters, java_import
from py4j.protocol import Py4JJavaError

# dataframe() wraps an existing JVM DataFrame with the internal DataFrame(jdf, sql_ctx) constructor
# (no public API for that). PySpark 3.4+/4.x warns "DataFrame constructor is internal" each time;
# silence just that message so notebook cells and logs aren't polluted by it.
warnings.filterwarnings("ignore", message="DataFrame constructor is internal", category=UserWarning)

# ------------------------------------------------------------------------------
# The kernel injects these:
#   gateway_address, gateway_port
#   workflow_id, node_id, port_number, dataframe_storage_type ('input' | 'output')
# ------------------------------------------------------------------------------

# Build a Py4J gateway to the already-running JVM. Modern py4j (0.10.9.x, bundled with
# Spark 3.4) configures the client via GatewayParameters; the old positional GatewayClient
# with address=/port= kwargs is legacy. This matches how PySpark 3.4's own java_gateway
# connects. The callback server is off by default.
gateway = JavaGateway(
    gateway_parameters=GatewayParameters(
        address=gateway_address,
        port=gateway_port,
        auto_convert=True,
    ),
)

# Get existing Spark handles from the entry point
java_spark_context = gateway.entry_point.getSparkContext()
java_spark_conf = gateway.entry_point.getSparkConf()

# Helpful JVM imports
java_import(gateway.jvm, "org.apache.spark.SparkEnv")
java_import(gateway.jvm, "org.apache.spark.SparkConf")
java_import(gateway.jvm, "org.apache.spark.api.java.*")
java_import(gateway.jvm, "org.apache.spark.api.python.*")
java_import(gateway.jvm, "org.apache.spark.mllib.api.python.*")
java_import(gateway.jvm, "org.apache.spark.sql.*")
java_import(gateway.jvm, "org.apache.spark.sql.hive.*")
java_import(gateway.jvm, "scala.Tuple2")
java_import(gateway.jvm, "scala.collection.immutable.List")

# Some environments gate PySpark with an auth token; disable that path
os.environ["PYSPARK_GATEWAY_ENABLED"] = "1"

# ------------------------------------------------------------------------------
# Create a Python SparkContext wrapper around the existing JVM SparkContext
# ------------------------------------------------------------------------------
if SparkContext._active_spark_context is None:
    SparkContext._ensure_initialized(gateway=gateway)

    sc = object.__new__(SparkContext)
    sc._jsc = java_spark_context
    sc._jvm = gateway.jvm
    sc._gateway = gateway
    sc._conf = SparkConf(_jvm=gateway.jvm, _jconf=java_spark_conf)

    # Minimal serializer setup. Spark 3.0 renamed PickleSerializer -> CPickleSerializer
    # (the old name is gone in Spark 3.4); fall back for older Spark just in case.
    try:
        from pyspark.serializers import CPickleSerializer as _PickleSerializer
    except ImportError:
        from pyspark.serializers import PickleSerializer as _PickleSerializer
    from pyspark.serializers import BatchedSerializer
    sc._batchSize = 1
    sc._unbatched_serializer = _PickleSerializer()
    sc._serializer = BatchedSerializer(sc._unbatched_serializer, batchSize=sc._batchSize)
    sc.serializer = sc._serializer

    # Python exec/version
    sc.pythonExec = sys.executable
    sc._pythonExec = sys.executable
    sc.pythonVer = "%d.%d" % sys.version_info[:2]

    # Misc state expected by PySpark
    sc.environment = {}
    sc._pickled_broadcast_vars = []
    sc._encryption_enabled = False
    sc.master = sc._conf.get("spark.master", "unknown")
    sc._temp_dir = tempfile.mkdtemp(prefix="pyspark-")
    sc._python_includes = []
    sc._javaAccumulator = None
    sc.profiler_collector = None
    sc._profile_stats = []
    sc._next_rdd_id = 0
    sc._stopped = False
    sc._default_parallelism = None

    SparkContext._active_spark_context = sc
else:
    sc = SparkContext._active_spark_context

# ------------------------------------------------------------------------------
# SparkSession / SQLContext wrapping (bound to the same JVM session)
# ------------------------------------------------------------------------------
from pyspark.sql import SparkSession

# Get the JVM SparkSession from your entry point and wrap it
java_spark_sql_session = gateway.entry_point.getNewSparkSQLSession()
java_spark_session = java_spark_sql_session.getSparkSession()
spark = SparkSession(sc, jsparkSession=java_spark_session)

# Build a SQLContext that is explicitly tied to the *same* JVM SQLContext
java_sql_context = java_spark_session.sqlContext()
sqlContext = SQLContext(sc, sparkSession=spark, jsqlContext=java_sql_context)

# ------------------------------------------------------------------------------
# DataFrame helpers
# ------------------------------------------------------------------------------
def dataframe():
    """
    Retrieve a DataFrame from Seahorse storage via the JVM entry point and wrap it
    with a SQLContext (not SparkSession) so PySpark internals like .toPandas() work.
    """
    if node_id is None or port_number is None:
        raise Exception("No edge is connected to this Notebook")

    try:
        if dataframe_storage_type == "output":
            java_df = gateway.entry_point.retrieveOutputDataFrame(workflow_id, node_id, port_number)
        else:
            assert dataframe_storage_type == "input"
            java_df = gateway.entry_point.retrieveInputDataFrame(workflow_id, node_id, port_number)
    except Py4JJavaError:
        raise Exception("Input operation is not yet executed")

    # IMPORTANT: pass a SQLContext here (DataFrame.toPandas expects df.sql_ctx._conf).
    # Suppress the benign "DataFrame constructor is internal" UserWarning AT THE CALL SITE:
    # IPython resets warning registries per cell, so a module-level filter can still let it show
    # in a notebook cell — catch_warnings here guarantees the user never sees it.
    with warnings.catch_warnings():
        warnings.filterwarnings("ignore", message="DataFrame constructor is internal")
        return DataFrame(jdf=java_df, sql_ctx=sqlContext)


def move_to_local_sqlContext(df):
    """
    If you need to 'detach' df from its original plan, recreate it via a temp view.
    Use the same session that owns df, materialize, then drop the view.
    """
    import uuid
    temp_view = "temp_view_" + uuid.uuid4().hex

    # Register view on df's own session
    df.createOrReplaceTempView(temp_view)

    # Use the session tied to this DF/SQLContext
    # SQLContext in Spark 3 exposes .sparkSession
    sess = getattr(df.sql_ctx, "sparkSession", spark)

    # Query with the same session/catalog and materialize before dropping the view
    result_df = sess.sql(f"SELECT * FROM `{temp_view}`").cache()
    _ = result_df.count()
    try:
        sess.catalog.dropTempView(temp_view)
    except Exception:
        pass

    return result_df

# ------------------------------------------------------------------------------
# Example:
# df = dataframe()
# pdf = move_to_local_sqlContext(df).toPandas()
# ------------------------------------------------------------------------------

