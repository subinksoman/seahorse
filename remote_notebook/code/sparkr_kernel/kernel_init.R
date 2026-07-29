entryPointId <- "0"

# R will install packages to first lib path in here. We will mount it as docker volume to persist packages.
.libPaths(c(file.path("/opt/R_Libs"), file.path(Sys.getenv('SPARK_HOME'), 'R', 'lib'), .libPaths()))
library(SparkR)

SparkR:::connectBackend(r_backend_host, r_backend_port, timeout=600)

assign(".scStartTime", as.integer(Sys.time()), envir = SparkR:::.sparkREnv)

entryPoint <- SparkR:::getJobj(entryPointId)

assign(".sparkRjsc", SparkR:::callJMethod(entryPoint, "getSparkContext"), envir = SparkR:::.sparkREnv)
assign("sc", get(".sparkRjsc", envir = SparkR:::.sparkREnv), envir = .GlobalEnv)

sparkSQLSession <- SparkR:::callJMethod(entryPoint, "getNewSparkSQLSession")

sparkVersion <- SparkR:::callJMethod(sc, "version")
# Spark 3.x/4.x (modernization target 3.4.4). SparkR's getSparkSession API is unchanged
# from the 2.x line, so the same body applies.
sparkVersionSupported <- startsWith(sparkVersion, "3.") || startsWith(sparkVersion, "4.")
if (sparkVersionSupported) {
  assign(".sparkRsession", SparkR:::callJMethod(sparkSQLSession, "getSparkSession"), envir = SparkR:::.sparkREnv)
  assign("spark", get(".sparkRsession", envir = SparkR:::.sparkREnv), envir = .GlobalEnv)
} else {
  msg <- paste("Unhandled Spark Version:", sparkVersion, "- this code is for Spark 3.x/4.x")
  stop(msg)
}

dataframe <- function() {
    if (!exists("workflow_id") || !exists("node_id") || !exists("port_number")) {
        stop("No edge is connected to this Notebook")
    }

    sdf <- tryCatch({
        if (dataframe_storage_type == "output") {
            SparkR:::callJMethod(entryPoint, "retrieveOutputDataFrame",
                                 toString(workflow_id), toString(node_id), as.integer(port_number))
        } else {
            SparkR:::callJMethod(entryPoint, "retrieveInputDataFrame",
                                 toString(workflow_id), toString(node_id), as.integer(port_number))
        }
    }, error = function(err) {
        stop("Input operation is not yet executed")
    })

    SparkR:::dataFrame(SparkR:::callJMethod(spark,
                                            "createDataFrame",
                                            SparkR:::callJMethod(sdf, "rdd"),
                                            SparkR:::callJMethod(sdf, "schema")))
}
