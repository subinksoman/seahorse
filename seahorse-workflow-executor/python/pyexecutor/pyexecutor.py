# Copyright 2015 deepsense.ai (CodiLime, Inc)
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
# See the License for the specific language governing permissions and
# limitations under the License.

import argparse
import os
import sys
import time
from py4j.java_gateway import JavaGateway, GatewayClient, CallbackServerParameters, java_import
from py4j.protocol import Py4JError
from pyspark import SparkContext, SparkConf
from pyspark.sql import SparkSession

from code_executor import CodeExecutor
from simple_logging import log_debug, log_info, log_warn, log_error


class PyExecutor(object):
    def __init__(self, gateway_address):
        self.gateway_address = gateway_address

    def run(self):
        log_info("PyExecutor: starting")
        gateway = self._initialize_gateway(self.gateway_address)
        if not gateway:
            log_error('Failed to initialize java gateway')
            return

        # noinspection PyProtectedMember
        callback_server_port = gateway._callback_server.server_socket.getsockname()[1]
        log_debug(f"Callback server port: {callback_server_port}")
        
        spark_context, spark_session = self._initialize_spark_contexts(gateway)
        code_executor = CodeExecutor(spark_context, spark_session, gateway.entry_point)

        try:
            log_debug("Registering callback server port")
            gateway.entry_point.registerCallbackServerPort(callback_server_port)
            log_debug("Registering code executor")
            gateway.entry_point.registerCodeExecutor(code_executor)
            log_debug("Registration complete")
        except Py4JError as e:
            log_error('Exception while registering codeExecutor, or callback server port: {}'.format(e))
            gateway.close()
            return

        # Wait for the end of the world or being orphaned
        try:
            log_info("PyExecutor: ready (session running)")
            while True:
                if os.getppid() == 1:
                    log_info("PyExecutor: parent gone, stopping session")
                    break
                time.sleep(1)
        except KeyboardInterrupt:
            log_info("PyExecutor: stopping session")

        gateway.close()

    @staticmethod
    def _initialize_spark_contexts(gateway):
        log_debug("About to call getSparkContext")
        java_spark_context = gateway.entry_point.getSparkContext()
        log_debug("Got JavaSparkContext")
        
        java_spark_conf = java_spark_context.getConf()
        log_debug("Got JavaSparkConf")

        # For Spark 3.x, we need to handle the security check
        log_debug("Setting up PySpark with existing Java context")
        
        try:
            # First, we need to set up the environment to bypass the security check
            # This is done by setting the gateway as authorized
            log_debug("Setting up authorized gateway")
            
            # Set environment variable to mark this as an authorized gateway
            os.environ["PYSPARK_GATEWAY_ENABLED"] = "1"
            
            # Initialize PySpark internals
            log_debug("Initializing PySpark internals")
            SparkContext._ensure_initialized(gateway=gateway)
            
            # Check if there's already an active context
            if SparkContext._active_spark_context is None:
                log_debug("No active SparkContext, creating wrapper")
                
                # For Spark 3.x with existing Java context, we need to use a different approach
                # We'll create the context without initializing a new Java context
                spark_context = SparkContext._active_spark_context = object.__new__(SparkContext)
                spark_context._jsc = java_spark_context
                spark_context._jvm = gateway.jvm
                spark_context._gateway = gateway
                
                # Get the accumulator server port
                log_debug("Getting accumulator server port")
                spark_context._accumulatorServer = None
                
                # Set up the Python accumulator server if needed
                try:
                    from pyspark.accumulators import _start_update_server
                    log_debug("Starting accumulator server")
                    # For Spark 3.x, we need to provide an auth token
                    auth_token = None
                    if hasattr(spark_context._jsc, "authHelper"):
                        auth_token = spark_context._jsc.authHelper().secret()
                    spark_context._accumulatorServer = _start_update_server(auth_token)
                    spark_context._jsc.sc().setLocalProperty(
                        "spark.python.accumulatorServer.port",
                        str(spark_context._accumulatorServer.port)
                    )
                except Exception as e:
                    log_debug(f"Could not start accumulator server: {e}")
                
                # Initialize other SparkContext attributes
                spark_context._conf = SparkConf(_jvm=gateway.jvm, _jconf=java_spark_conf)
                spark_context._batchSize = 1  # Default batch size
                spark_context._pythonExec = sys.executable
                spark_context._javaAccumulator = None
                
                # Set Python executable and version info
                # Get the Python executable from Spark configuration or use a default
                try:
                    # Check if there's a configured Python executable for executors
                    pyspark_python = os.environ.get('PYSPARK_PYTHON')
                    if not pyspark_python:
                        # Try to get from Spark conf
                        pyspark_python = spark_context._conf.get('spark.pyspark.python', None)
                    
                    if not pyspark_python:
                        # Use a common Python path that should exist on executors
                        # Common paths: /usr/bin/python3, /usr/bin/python, python3, python
                        for python_path in ['/opt/conda/bin/python', '/opt/conda/bin/python3.7', '/usr/bin/python3.7', '/usr/bin/python3', '/usr/bin/python', 'python3', 'python']:
                            try:
                                # Check if this Python exists by trying to get its version
                                import subprocess
                                result = subprocess.run([python_path, '--version'], 
                                                      capture_output=True, 
                                                      text=True, 
                                                      timeout=5)
                                if result.returncode == 0:
                                    pyspark_python = python_path
                                    log_debug(f"Found Python at {python_path}")
                                    break
                            except:
                                continue
                    
                    if not pyspark_python:
                        # Fallback to current Python
                        pyspark_python = sys.executable
                        log_warn(f"Using driver Python {pyspark_python}, may not exist on executors")
                    
                    spark_context.pythonExec = pyspark_python
                    spark_context._pythonExec = pyspark_python
                    
                    # Also set the environment variable
                    os.environ['PYSPARK_PYTHON'] = pyspark_python
                    
                    log_debug(f"Set Python executable to {pyspark_python}")
                    
                except Exception as e:
                    log_debug(f"Error setting Python executable: {e}")
                    spark_context.pythonExec = sys.executable
                    spark_context._pythonExec = sys.executable
                
                spark_context.pythonVer = "%d.%d" % sys.version_info[:2]
                
                # Initialize environment as empty dict
                spark_context.environment = {}
                # Try to get some basic environment info
                try:
                    # Add Python version to environment
                    spark_context.environment['PYTHONVERSION'] = spark_context.pythonVer
                    # Add any Spark Python specific env vars
                    for key, value in os.environ.items():
                        if key.startswith('PYSPARK_'):
                            spark_context.environment[key] = value
                except Exception as e:
                    log_debug(f"Error setting environment: {e}")
                
                # Initialize serializers - CRITICAL for RDD operations
                log_debug("Initializing serializers")
                from pyspark.serializers import PickleSerializer, BatchedSerializer
                spark_context._unbatched_serializer = PickleSerializer()
                spark_context._serializer = BatchedSerializer(spark_context._unbatched_serializer,
                                                              batchSize=spark_context._batchSize)
                spark_context.serializer = spark_context._serializer
                
                # Initialize encryption settings - handle missing method gracefully
                try:
                    spark_context._encryption_enabled = spark_context._jsc.sc().isEncryptionEnabled()
                except Exception as e:
                    log_debug(f"Could not get encryption status: {e}, defaulting to False")
                    spark_context._encryption_enabled = False
                
                # Initialize Python server if needed
                log_debug("Setting up Python server")
                spark_context._python_includes = []
                
                # Initialize temp directory for RDD operations
                log_debug("Setting up temp directory")
                import tempfile
                import atexit
                import shutil
                spark_context._temp_dir = tempfile.mkdtemp(prefix="pyspark-")
                # Register cleanup
                def cleanup_temp_dir():
                    try:
                        shutil.rmtree(spark_context._temp_dir)
                    except Exception:
                        pass
                atexit.register(cleanup_temp_dir)
                
                # Set master URL from conf
                try:
                    spark_context.master = spark_context._conf.get("spark.master", "unknown")
                except Exception as e:
                    log_debug(f"Could not get master: {e}")
                    spark_context.master = "unknown"
                
                # Set application ID
                try:
                    spark_context._jsc_application_id = spark_context._jsc.sc().applicationId()
                except Exception as e:
                    log_debug(f"Could not get application ID: {e}")
                    spark_context._jsc_application_id = None
                    
                # Initialize profiler settings
                spark_context._profile_stats = []
                spark_context._profile_dump_path = None
                spark_context.profiler_collector = None
                
                # Initialize RDD settings
                spark_context._next_rdd_id = 0
                spark_context._jvm_dumping_enabled = False
                spark_context._checkpointDir = None
                
                # Initialize broadcast variables
                spark_context._pickled_broadcast_vars = []
                spark_context._broadcast_vars = {}
                
                # Initialize other required attributes for RDD operations
                spark_context._stopped = False
                spark_context._default_parallelism = None
                
                log_debug("SparkContext wrapper created")
            else:
                log_debug("Using existing active SparkContext")
                spark_context = SparkContext._active_spark_context
                
        except Exception as e:
            log_debug(f"Error creating SparkContext: {str(e)}")
            import traceback
            log_debug(f"Traceback: {traceback.format_exc()}")
            raise
        
        log_info(f"PyExecutor: Spark {spark_context.version} context ready")

        log_debug("About to call getSparkSQLSession")
        java_spark_sql_session = gateway.entry_point.getSparkSQLSession()
        log_debug("Got JavaSparkSQLSession")
        
        spark_version = spark_context.version
        spark_session = None
        
        # For Spark 3.0.0 and later versions (incl. the Spark 4.x line — the SparkSession
        # wrapper below reconstructs from the existing JVM session, which is stable across 3.x/4.x).
        if spark_version.startswith("3.") or spark_version.startswith("4."):
            log_debug("Initializing SparkSession for Spark 3.x/4.x")
            try:
                # Get the Java SparkSession from the Java SQL session
                log_debug("Getting Java SparkSession from JavaSparkSQLSession")
                java_spark_session = java_spark_sql_session.getSparkSession()
                log_debug("Got Java SparkSession object")
                
                # Check if SparkSession already exists
                if hasattr(SparkSession, "_instantiatedSession") and SparkSession._instantiatedSession is not None:
                    log_debug("Using existing SparkSession")
                    spark_session = SparkSession._instantiatedSession
                else:
                    # Bind a Python SparkSession to the existing JVM session using PySpark's
                    # SUPPORTED constructor — exactly what the notebook kernel does and what makes
                    # .toPandas() work there (kernel_init.py: SparkSession(sc, jsparkSession=...)).
                    # It wires up _jconf, _jsparkSession, _wrapped, etc. correctly for the installed
                    # PySpark (3.x and 4.x). The previous hand-built object.__new__(SparkSession)
                    # wrapper set a WrappedHelper that lacked _jconf, so on PySpark 4.x
                    # df.toPandas() failed with:
                    #   AttributeError: 'WrappedHelper' object has no attribute '_jconf'
                    # (PySpark 4's _to_pandas reads self.sparkSession._jconf.getConfs(...)).
                    log_debug("Creating SparkSession via supported constructor")
                    spark_session = SparkSession(spark_context, jsparkSession=java_spark_session)
                    SparkSession._instantiatedSession = spark_session
                    SparkSession._activeSession = spark_session
                    log_debug("SparkSession created successfully")
                
            except Exception as e:
                log_debug(f"Error creating SparkSession: {str(e)}")
                log_debug(f"Error type: {type(e).__name__}")
                import traceback
                log_debug(f"Traceback: {traceback.format_exc()}")
                raise
        else:
            log_error("Spark version {} is not supported. This code is for Spark 3.x/4.x".format(spark_version))
            raise ValueError("Spark version {} is not supported. This code is for Spark 3.x/4.x".format(spark_version))

        log_debug(f"Successfully initialized contexts")
        return spark_context, spark_session

    @staticmethod
    def _initialize_gateway(gateway_address):
        (host, port) = gateway_address
        log_debug(f"Initializing gateway at {host}:{port}")

        callback_params = CallbackServerParameters(address=host, port=0)

        gateway = JavaGateway(GatewayClient(address=host, port=port),
                              start_callback_server=True,
                              auto_convert=True,
                              callback_server_parameters=callback_params)
        try:
            log_debug("Importing Java classes")
            java_import(gateway.jvm, "org.apache.spark.SparkEnv")
            java_import(gateway.jvm, "org.apache.spark.SparkConf")
            java_import(gateway.jvm, "org.apache.spark.api.java.*")
            java_import(gateway.jvm, "org.apache.spark.api.python.*")
            java_import(gateway.jvm, "org.apache.spark.mllib.api.python.*")
            java_import(gateway.jvm, "org.apache.spark.sql.*")
            java_import(gateway.jvm, "org.apache.spark.sql.hive.*")
            java_import(gateway.jvm, "scala.Tuple2")
            java_import(gateway.jvm, "scala.collection.immutable.List")
            log_debug("Java imports completed")
        except Py4JError as e:
            log_error('Error while initializing java gateway: {}'.format(e))
            gateway.close()
            return None

        log_debug('Java Gateway initialized {}'.format(gateway))
        return gateway


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--gateway-address', action='store')
    args = parser.parse_args()

    gateway_address = args.gateway_address.split(':')
    gateway_address = (gateway_address[0], int(gateway_address[1]))

    log_debug('Initializing PyExecutor at {}'.format(gateway_address))
    log_debug(f"Starting PyExecutor with gateway address: {gateway_address}")
    
    py_executor = PyExecutor(gateway_address=gateway_address)
    py_executor.run()
    log_debug('PyExecutor ended!')


if __name__ == '__main__':
    main()
