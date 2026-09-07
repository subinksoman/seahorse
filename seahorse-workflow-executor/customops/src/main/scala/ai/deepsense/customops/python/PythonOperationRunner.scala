/**
 * Copyright 2026 6D Technologies
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package ai.deepsense.customops.python

import scala.util.Try

import org.apache.spark.sql.SparkSession

import ai.deepsense.deeplang.ExecutionContext
import ai.deepsense.deeplang.doperables.dataframe.DataFrame
import ai.deepsense.deeplang.doperations.exceptions.CustomOperationExecutionException
import ai.deepsense.customops.doperables.MlflowModel

/**
 * Runs one custom-code node with one or two input DataFrames and one or more outputs.
 *
 * Input port 0 and output port 0 use the executor's normal `DataFrameStorage` channel; every other
 * port travels as a global temp view (see [[PythonShim]]). Views are named per node, so a re-run
 * replaces its own and concurrent nodes never collide, and are dropped once read.
 */
private[customops] case class PythonRunResult(dataFrames: Seq[DataFrame], model: MlflowModel)

private[customops] class PythonOperationRunner(ctx: ExecutionContext) {

  val nodeId: String = ctx.dataFrameStorage.nodeId.toString

  val workflowId: String = ctx.dataFrameStorage.workflowId.toString

  /** Where a node's `save_model()` record travels; pass to `PythonShim.assemble`. */
  val modelCapture: PythonShim.ModelCapture =
    PythonShim.ModelCapture(workflowId, nodeId, PythonShim.modelView(nodeId))

  /**
   * @param inputs      one or two input DataFrames; the second is published as the right input view
   * @param code        the script to submit, rendered via `PythonShim.assemble`
   * @param extraViews  the global temp views carrying output ports 1..n, in port order
   * @param collectModel whether to read back a `save_model()` record from the model view
   * @return the output DataFrames (port 0 first) and the model, empty if none was saved
   */
  def run(
      inputs: Seq[DataFrame],
      code: String,
      extraViews: Seq[String],
      collectModel: Boolean = false): PythonRunResult = {
    require(inputs.size <= 2, "at most two DataFrame inputs are supported")

    if (!ctx.customCodeExecutor.isPythonValid(code)) {
      throw CustomOperationExecutionException(
        "Code validation failed. The code must define a top-level `transform` function.")
    }

    val sparkSession = ctx.sparkSQLSession.sparkSession
    sparkSession.conf.set("spark.sql.execution.arrow.pyspark.enabled", "true")

    val rightView = inputs.lift(1).map { right =>
      val view = PythonShim.rightInputView(nodeId)
      right.sparkDataFrame.createOrReplaceGlobalTempView(view)
      view
    }

    try {
      // code_executor.py always fetches input port 0, so a node whose real input is not a
      // DataFrame (Push To MLflow) still has to put something there.
      val portZero = inputs.headOption
        .map(_.sparkDataFrame)
        .getOrElse(sparkSession.range(1).toDF())
      ctx.dataFrameStorage.withInputDataFrame(PythonShim.InputPortNumber, portZero) {
        ctx.customCodeExecutor.runPython(code) match {
          case Left(error) =>
            throw CustomOperationExecutionException(s"Execution exception:\n\n$error")
          case Right(_) =>
            val first = ctx.dataFrameStorage.getOutputDataFrame(PythonShim.OutputPortNumber)
              .map(DataFrame.fromSparkDataFrame)
              .getOrElse(throw CustomOperationExecutionException(
                "Operation finished successfully, but did not produce a DataFrame."))
            val dataFrames = first +: extraViews.zipWithIndex.map { case (view, index) =>
              readExtraOutput(sparkSession, view, index + 1)
            }
            val model =
              if (collectModel) readModel(sparkSession) else MlflowModel.Empty
            PythonRunResult(dataFrames, model)
        }
      }
    } finally {
      (rightView.toSeq ++ extraViews :+ modelCapture.viewName).foreach { view =>
        Try(sparkSession.catalog.dropGlobalTempView(view))
      }
    }
  }

  /**
   * An absent view means the node's code never called `save_model()`, which is legitimate — the
   * model port simply carries nothing.
   */
  private def readModel(sparkSession: SparkSession): MlflowModel = {
    val view = s"global_temp.${modelCapture.viewName}"
    if (!sparkSession.catalog.tableExists(view)) {
      MlflowModel.Empty
    } else {
      val row = sparkSession.table(view).head()
      def field(name: String): String =
        Try(Option(row.getAs[String](name)).getOrElse("")).getOrElse("")
      MlflowModel(
        modelPath = field(MlflowModel.PathColumn),
        flavor = field(MlflowModel.FlavorColumn),
        metricsJson = Option(field(MlflowModel.MetricsColumn)).filter(_.nonEmpty).getOrElse("{}"),
        paramsJson = Option(field(MlflowModel.ParamsColumn)).filter(_.nonEmpty).getOrElse("{}"))
    }
  }

  private def readExtraOutput(
      sparkSession: SparkSession,
      view: String,
      portNumber: Int): DataFrame = {
    if (!sparkSession.catalog.tableExists(s"global_temp.$view")) {
      throw CustomOperationExecutionException(
        s"Operation finished successfully, but did not produce a DataFrame for output " +
          s"port $portNumber.")
    }
    DataFrame.fromSparkDataFrame(sparkSession.table(s"global_temp.$view"))
  }
}
