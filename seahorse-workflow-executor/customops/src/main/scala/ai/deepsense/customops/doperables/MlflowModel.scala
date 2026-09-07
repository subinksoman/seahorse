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

package ai.deepsense.customops.doperables

import org.apache.spark.sql.types.StructType
import spray.json._

import ai.deepsense.commons.types.ColumnType
import ai.deepsense.customops.python.{PythonOperationRunner, PythonShim}
import ai.deepsense.deeplang.ExecutionContext
import ai.deepsense.deeplang.doperables.Transformer
import ai.deepsense.deeplang.doperables.dataframe.DataFrame
import ai.deepsense.deeplang.doperables.report.Report
import ai.deepsense.deeplang.doperations.exceptions.CustomOperationExecutionException
import ai.deepsense.deeplang.params.{Param, StringParam}
import ai.deepsense.reportlib.model.Table

/**
 * A model a Python transformation trained and saved, as a typed port value.
 *
 * The model object itself cannot cross a port — it lives in the Python process — so this carries
 * what a downstream node needs: where the artifact was written, which MLflow flavour wrote it, and
 * the metrics and params the training code recorded.
 *
 * It is a [[Transformer]] rather than a bare `DOperable` for two reasons. The editor derives port
 * styling and connectability purely from the type hierarchy — `graph-style.service.ts` asks
 * `IsDescendantOf(qualifier, 'ai.deepsense.deeplang.doperables.Transformer')` — so being one makes
 * the model port render exactly like the built-in Python Transformation's transformer port instead
 * of an inert read-only dot. And it means the core **Transform**, **Write Transformer** and
 * **Read Transformer** operations accept it, so scoring and persistence come for free.
 *
 * Because the editor now offers those connections, `applyTransform` really scores: it loads the
 * artifact with `mlflow.pyfunc` and predicts. An empty model (no `save_model()` call upstream)
 * says so rather than failing obscurely.
 */
class MlflowModel extends Transformer {

  val modelPath = StringParam(
    name = "model path",
    description = Some("Directory the training node's save_model() wrote the artifact to."))
  setDefault(modelPath, "")

  val flavor = StringParam(
    name = "flavor",
    description = Some("MLflow flavour that saved the artifact, e.g. `sklearn`."))
  setDefault(flavor, "")

  val metricsJson = StringParam(
    name = "metrics",
    description = Some("Metrics the training code passed to save_model(), as a JSON object."))
  setDefault(metricsJson, "{}")

  val paramsJson = StringParam(
    name = "params",
    description = Some("Params the training code passed to save_model(), as a JSON object."))
  setDefault(paramsJson, "{}")

  override val params: Array[Param[_]] = Array(modelPath, flavor, metricsJson, paramsJson)

  def getModelPath: String = $(modelPath)
  def setModelPath(value: String): this.type = set(modelPath, value)

  def getFlavor: String = $(flavor)
  def setFlavor(value: String): this.type = set(flavor, value)

  def getMetricsJson: String = $(metricsJson)
  def setMetricsJson(value: String): this.type = set(metricsJson, value)

  def getParamsJson: String = $(paramsJson)
  def setParamsJson(value: String): this.type = set(paramsJson, value)

  /** Empty means the upstream node's code never called `save_model()`. */
  def isDefined: Boolean = getModelPath.nonEmpty

  def metrics: Map[String, String] = MlflowModel.parseJsonObject(getMetricsJson)

  def modelParams: Map[String, String] = MlflowModel.parseJsonObject(getParamsJson)

  override protected def transformerName: String = "MLflow Model"

  /** Scores `df` with the saved model, appending the prediction column(s). */
  override protected def applyTransform(ctx: ExecutionContext, df: DataFrame): DataFrame = {
    if (!isDefined) {
      throw CustomOperationExecutionException(
        "This model port carries no model, so there is nothing to score with. The Python " +
          "transformation feeding it must call save_model(...) — optional there, but required " +
          "before the model can be used.")
    }
    val runner = new PythonOperationRunner(ctx)
    val code = PythonShim.assemble(
      userCode = None,
      rightInputView = None,
      extraOutputViews = Nil,
      model = None,
      entryPoint = PythonShim.predictHelper +
        s"""
           |_SH_MODEL_PATH = ${PythonShim.stringLiteral(Some(getModelPath))}
           |""".stripMargin + MlflowModel.scoreScript)
    runner.run(Seq(df), code, extraViews = Nil).dataFrames.head
  }

  /** The prediction columns only exist once the model has run. */
  override protected def applyTransformSchema(schema: StructType): Option[StructType] = None

  override def report(extended: Boolean = true): Report = {
    val base = super.report(extended)
    if (!isDefined) {
      base.withAdditionalTable(MlflowModel.keyValueTable("Model", Seq(
        "status" -> "no model - the upstream code did not call save_model()")))
    } else {
      base
        .withAdditionalTable(MlflowModel.keyValueTable("Model", Seq(
          "path" -> getModelPath,
          "flavor" -> getFlavor)))
        .withAdditionalTable(MlflowModel.keyValueTable("Metrics", metrics.toSeq.sorted))
        .withAdditionalTable(MlflowModel.keyValueTable("Params", modelParams.toSeq.sorted))
    }
  }
}

object MlflowModel {

  def apply(
      modelPath: String,
      flavor: String,
      metricsJson: String,
      paramsJson: String): MlflowModel =
    new MlflowModel()
      .setModelPath(modelPath)
      .setFlavor(flavor)
      .setMetricsJson(metricsJson)
      .setParamsJson(paramsJson)

  def Empty: MlflowModel = new MlflowModel()

  /** Column names of the one-row DataFrame the Python side publishes to describe a saved model. */
  val PathColumn = "model_path"
  val FlavorColumn = "flavor"
  val MetricsColumn = "metrics_json"
  val ParamsColumn = "params_json"

  private def parseJsonObject(json: String): Map[String, String] =
    scala.util.Try {
      json.parseJson.asJsObject.fields.map {
        case (key, JsString(value)) => key -> value
        case (key, value) => key -> value.toString
      }
    }.getOrElse(Map.empty)

  private def keyValueTable(name: String, entries: Seq[(String, String)]): Table =
    Table(
      name = name,
      description = "",
      columnNames = Some(List("key", "value")),
      columnTypes = List(ColumnType.string, ColumnType.string),
      rowNames = None,
      values =
        if (entries.isEmpty) List(List(Some("-"), Some("-")))
        else entries.map { case (k, v) => List(Some(k), Some(v)) }.toList)

  /**
   * Scoring runs through the same Python channel as everything else: the artifact is an MLflow
   * model directory, so `pyfunc` loads any flavour without this code knowing which.
   */
  private[customops] val scoreScript: String =
    """
      |def transform(dataframe):
      |    import os
      |
      |    try:
      |        import mlflow
      |        import pandas as pd
      |    except ImportError as error:
      |        raise Exception(
      |            "Scoring needs MLflow and pandas in the session's Python interpreter ("
      |            + str(error) + ").")
      |
      |    if not os.path.isdir(_SH_MODEL_PATH):
      |        raise Exception(
      |            "The model directory '" + _SH_MODEL_PATH + "' is not visible to the executor. "
      |            "It must be somewhere shared and persistent - SEAHORSE_MODEL_DIR defaults to "
      |            "/library/seahorse-models, which is mounted read-write in the session "
      |            "container.")
      |
      |    model = mlflow.pyfunc.load_model(_SH_MODEL_PATH)
      |
      |    # Scoring happens on the driver, so the input is collected. Fine for the batch sizes
      |    # this is meant for; a very large input should be scored with a Spark UDF instead.
      |    frame = dataframe.toPandas()
      |    features, declared = _sh_model_input(model, frame)
      |    try:
      |        raw = model.predict(features)
      |    except Exception as error:
      |        raise Exception(_sh_predict_error(error, declared))
      |
      |    return _sh_attach_predictions(frame, raw)
      |""".stripMargin
}
