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

package ai.deepsense.customops.doperations

import scala.reflect.runtime.{universe => ru}

import ai.deepsense.customops.python.{PythonOperationRunner, PythonShim}
import ai.deepsense.deeplang.DOperation.Id
import ai.deepsense.deeplang.doperables.dataframe.DataFrame
import ai.deepsense.deeplang.exceptions.DeepLangException
import ai.deepsense.deeplang.inference.{InferContext, InferenceWarnings}
import ai.deepsense.deeplang.params.{Param, StringParam}
import ai.deepsense.deeplang.{DKnowledge, DOperation1To1, ExecutionContext}

/**
 * Scores a DataFrame with a model pulled from MLflow, without needing the training node in the
 * same workflow — the model is identified by its Model Registry name and version, so scoring can
 * run in a workflow, session or deployment of its own.
 *
 * The output is the predictions themselves — one column named `prediction`, or `prediction_0`,
 * `prediction_1`, ... for a model that returns several. Row order matches the input, but no key
 * column is carried over, so anything that needs to re-associate predictions with input rows
 * should score a frame that already holds its key and use a model port through `Transform`
 * instead, which appends rather than replaces.
 *
 * All of the MLflow API is generated from the parameters; the node takes no code.
 */
final class MlflowPredict extends DOperation1To1[DataFrame, DataFrame] {

  override val id: Id = "1f83b6d4-52ae-47c9-9d05-8e7c31a4f6b2"

  override val name: String = "MLflow Predict"

  override val description: String =
    "Loads a model from MLflow and appends its predictions to the input DataFrame"

  val modelName = StringParam(
    name = "model name",
    description = Some(
      "Registered model name in the MLflow Model Registry, e.g. `churn`. Ignored when " +
        "'model uri' is set."))
  setDefault(modelName, "")

  def getModelName: String = $(modelName)
  def setModelName(value: String): this.type = set(modelName, value)

  val modelVersion = StringParam(
    name = "version or alias",
    description = Some(
      "Which version of the registered model: a number (`3`), an alias (`champion`), or empty " +
        "for the latest version."))
  setDefault(modelVersion, "")

  def getModelVersion: String = $(modelVersion)
  def setModelVersion(value: String): this.type = set(modelVersion, value)

  override def specificParams: Array[Param[_]] =
    Array(modelName, modelVersion)

  override protected def customValidateParams: Vector[DeepLangException] = {
    val errors = Vector.newBuilder[DeepLangException]
    if (getModelName.trim.isEmpty) {
      errors += new DeepLangException(
        "'model name' must name a model in the MLflow Model Registry")
    }
    errors.result()
  }

  override protected def execute(input: DataFrame)(ctx: ExecutionContext): DataFrame = {
    val runner = new PythonOperationRunner(ctx)
    runner.run(Seq(input), renderCode(), extraViews = Nil).dataFrames.head
  }

  private[customops] def renderCode(): String = {
    def literal(value: String) = PythonShim.stringLiteral(Some(value.trim).filter(_.nonEmpty))
    PythonShim.assemble(
      userCode = None,
      rightInputView = None,
      extraOutputViews = Nil,
      model = None,
      entryPoint = PythonShim.artifactErrorHelper + PythonShim.predictHelper +
        s"""
           |_SH_MODEL_NAME = ${literal(getModelName)}
           |_SH_MODEL_VERSION = ${literal(getModelVersion)}
           |""".stripMargin + MlflowPredict.predictScript)
  }

  /**
   * The prediction's type is only known once the model has run, so the output schema stays
   * unknown — the same position as the Python transformations.
   */
  override protected def inferKnowledge(
      inputKnowledge: DKnowledge[DataFrame])(
      ctx: InferContext): (DKnowledge[DataFrame], InferenceWarnings) =
    (DKnowledge(DataFrame.forInference()), InferenceWarnings.empty)

  @transient override lazy val tTagTI_0: ru.TypeTag[DataFrame] = ru.typeTag[DataFrame]
  @transient override lazy val tTagTO_0: ru.TypeTag[DataFrame] = ru.typeTag[DataFrame]
}

object MlflowPredict {

  private[customops] val predictScript: String =
    """
      |def _sh_resolve_uri():
      |    # MLflow understands models:/<name>/<version>, models:/<name>@<alias> and
      |    # models:/<name>/latest, so version selection needs no registry calls of our own.
      |    selector = _SH_MODEL_VERSION
      |    if not selector:
      |        return "models:/" + _SH_MODEL_NAME + "/latest"
      |    if str(selector).isdigit():
      |        return "models:/" + _SH_MODEL_NAME + "/" + str(selector)
      |    return "models:/" + _SH_MODEL_NAME + "@" + str(selector)
      |
      |
      |def transform(dataframe):
      |    import os
      |
      |    try:
      |        import mlflow
      |    except ImportError as error:
      |        raise Exception(
      |            "MLflow is not installed in the session's Python interpreter ("
      |            + str(error) + ").")
      |
      |
      |    uri = _sh_resolve_uri()
      |    try:
      |        model = mlflow.pyfunc.load_model(uri)
      |    except Exception as error:
      |        text = str(error).lower()
      |        if ("not found" in text or "does not exist" in text
      |                or "no versions" in text or "registered model" in text):
      |            raise Exception(
      |                "MLflow has no model at '" + uri + "' (" + str(error).splitlines()[0]
      |                + "). Check the model name, the version or alias, and that "
      |                "MLFLOW_TRACKING_URI in the executor's environment points at the "
      |                "registry holding it.")
      |        raise Exception(_sh_artifact_error(error, "downloading the model"))
      |
      |    # Scoring runs on the driver, so the input is collected. Fine for batch sizes this is
      |    # meant for; a very large input wants a Spark UDF instead.
      |    frame = dataframe.toPandas()
      |    if frame.empty:
      |        raise Exception(
      |            "The input DataFrame is empty, so there is nothing to score.")
      |
      |    features, declared = _sh_model_input(model, frame)
      |    try:
      |        raw = model.predict(features)
      |    except Exception as error:
      |        raise Exception(_sh_predict_error(error, declared))
      |
      |    return _sh_predictions_frame(raw)
      |""".stripMargin
}
