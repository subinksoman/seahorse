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

import org.apache.spark.sql.types.{StringType, StructField, StructType}

import ai.deepsense.customops.doperables.MlflowModel
import ai.deepsense.customops.python.{PythonOperationRunner, PythonShim}
import ai.deepsense.deeplang.DOperation.Id
import ai.deepsense.deeplang.doperables.dataframe.DataFrame
import ai.deepsense.deeplang.doperations.exceptions.CustomOperationExecutionException
import ai.deepsense.deeplang.inference.{InferContext, InferenceWarnings}
import ai.deepsense.deeplang.params.{Param, StringParam}
import ai.deepsense.deeplang.{DKnowledge, DOperation1To1, ExecutionContext}

/**
 * Logs an [[MlflowModel]] to MLflow and optionally registers it, then reports what landed there.
 *
 * The input is the typed model port of a Python transformation, so the path, flavour, metrics and
 * params are already known — this node reads them off the port rather than out of a
 * conventionally-named DataFrame. All of the MLflow API is generated from the parameters below;
 * the node takes no code, so nobody writes `start_run`, `log_artifacts` or `register_model`.
 */
final class PushToMlflow extends DOperation1To1[MlflowModel, DataFrame] {

  override val id: Id = "e4a7c015-9b62-4d38-83f1-2c6ad9074be5"

  override val name: String = "Push To MLflow"

  override val description: String =
    "Logs the model on the input port to MLflow and optionally registers it in the Model Registry"

  val registeredModelName = StringParam(
    name = "registered model name",
    description = Some(
      "Register the logged model in the MLflow Model Registry under this name. Leave empty to " +
        "log the run without registering. The registry needs a database-backed or HTTP tracking " +
        "URI; a plain file store cannot register models."))
  setDefault(registeredModelName, "")

  def getRegisteredModelName: String = $(registeredModelName)
  def setRegisteredModelName(value: String): this.type = set(registeredModelName, value)

  override def specificParams: Array[Param[_]] =
    Array(registeredModelName)

  override protected def execute(model: MlflowModel)(ctx: ExecutionContext): DataFrame = {
    if (!model.isDefined) {
      throw CustomOperationExecutionException(
        "The model port carries no model. The Python transformation feeding this node must call " +
          "save_model(model, metrics=..., params=...) — saving a model is optional there, but " +
          "this node has nothing to push without it.")
    }
    val runner = new PythonOperationRunner(ctx)
    runner.run(inputs = Nil, renderCode(model), extraViews = Nil).dataFrames.head
  }

  private[customops] def renderCode(model: MlflowModel): String = {
    def literal(value: String) = PythonShim.stringLiteral(Some(value.trim).filter(_.nonEmpty))
    PythonShim.assemble(
      userCode = None,                                   // the whole script is generated
      rightInputView = None,
      extraOutputViews = Nil,
      model = None,                                      // this node consumes a model, not saves one
      entryPoint = PythonShim.artifactErrorHelper + s"""
        |_SH_REGISTER_AS = ${literal(getRegisteredModelName)}
        |_SH_MODEL_PATH = ${literal(model.getModelPath)}
        |_SH_MODEL_FLAVOR = ${literal(model.getFlavor)}
        |_SH_METRICS_JSON = ${literal(model.getMetricsJson)}
        |_SH_PARAMS_JSON = ${literal(model.getParamsJson)}
        |""".stripMargin + PushToMlflow.pushScript)
  }

  /** Column names are fixed, so downstream nodes see them before the run happens. */
  override protected def inferKnowledge(
      modelKnowledge: DKnowledge[MlflowModel])(
      ctx: InferContext): (DKnowledge[DataFrame], InferenceWarnings) =
    (DKnowledge(DataFrame.forInference(PushToMlflow.OutputSchema)), InferenceWarnings.empty)

  @transient override lazy val tTagTI_0: ru.TypeTag[MlflowModel] = ru.typeTag[MlflowModel]
  @transient override lazy val tTagTO_0: ru.TypeTag[DataFrame] = ru.typeTag[DataFrame]
}

object PushToMlflow {

  val OutputColumns: Seq[String] = Seq(
    "run_id", "run_name", "experiment", "experiment_id", "model_uri", "registered_model",
    "model_version", "tracking_uri")

  val OutputSchema: StructType =
    StructType(OutputColumns.map(StructField(_, StringType, nullable = false)))

  /**
   * Generated in full, so the node hides MLflow entirely. Every value is a string: a column that
   * were absent would otherwise be all-null and unschemable.
   */
  private[customops] val pushScript: String =
    """
      |def transform(dataframe):
      |    import json
      |    import os
      |    import time
      |
      |    try:
      |        import mlflow
      |    except ImportError as error:
      |        raise Exception(
      |            "MLflow is not installed in the session's Python interpreter ("
      |            + str(error) + "). Install mlflow in the image that runs the executor.")
      |
      |    if not os.path.isdir(_SH_MODEL_PATH):
      |        raise Exception(
      |            "The model directory '" + _SH_MODEL_PATH + "' is not visible to the executor. "
      |            "It must be somewhere shared and persistent - SEAHORSE_MODEL_DIR defaults to "
      |            "/library/seahorse-models, which is mounted read-write in the session "
      |            "container.")
      |    if not os.path.isfile(os.path.join(_SH_MODEL_PATH, "MLmodel")):
      |        raise Exception(
      |            "'" + _SH_MODEL_PATH + "' has no MLmodel file, so MLflow cannot load it back as "
      |            "a model. save_model() writes one; a bare pickle does not.")
      |
      |
      |    def _as_dict(raw):
      |        if not raw:
      |            return {}
      |        try:
      |            value = json.loads(raw)
      |        except ValueError:
      |            return {}
      |        return value if isinstance(value, dict) else {}
      |
      |    metrics, bad_metrics = {}, []
      |    for key, value in _as_dict(_SH_METRICS_JSON).items():
      |        try:
      |            metrics[str(key)] = float(value)
      |        except (TypeError, ValueError):
      |            bad_metrics.append(str(key))
      |    if bad_metrics:
      |        raise Exception(
      |            "These metrics are not numeric, so MLflow cannot log them: "
      |            + ", ".join(sorted(bad_metrics))
      |            + ". Pass numbers to save_model(metrics=...), or move them to params.")
      |
      |    params = dict(
      |        (str(k), str(v)) for k, v in _as_dict(_SH_PARAMS_JSON).items())
      |
      |    # The experiment groups every run of one model; the run carries the timestamp, so
      |    # successive pushes stay comparable in a single experiment view.
      |    experiment = _SH_REGISTER_AS or "seahorse"
      |    mlflow.set_experiment(experiment)
      |    run_name = experiment + "-" + time.strftime("%Y%m%d-%H%M%S")
      |
      |    with mlflow.start_run(run_name=run_name) as run:
      |        if params:
      |            mlflow.log_params(params)
      |        if metrics:
      |            mlflow.log_metrics(metrics)
      |        if _SH_MODEL_FLAVOR:
      |            mlflow.set_tag("seahorse.flavor", _SH_MODEL_FLAVOR)
      |        mlflow.set_tag("seahorse.model_path", _SH_MODEL_PATH)
      |        try:
      |            mlflow.log_artifacts(_SH_MODEL_PATH, artifact_path="model")
      |        except Exception as error:
      |            raise Exception(_sh_artifact_error(error, "uploading the model"))
      |        run_id = run.info.run_id
      |        experiment_id = run.info.experiment_id
      |
      |    model_uri = "runs:/" + run_id + "/model"
      |    version = ""
      |    if _SH_REGISTER_AS:
      |        try:
      |            version = str(mlflow.register_model(model_uri, _SH_REGISTER_AS).version)
      |        except Exception as error:
      |            raise Exception(
      |                "Logged the run as " + run_id + ", but registering it as '"
      |                + _SH_REGISTER_AS + "' failed (" + str(error) + "). The Model Registry "
      |                "needs a database-backed or HTTP tracking URI; a plain file store cannot "
      |                "register models.")
      |
      |    return _sh_to_dataframe([{
      |        "run_id": run_id,
      |        "experiment": experiment,
      |        "run_name": run_name,
      |        "experiment_id": str(experiment_id),
      |        "model_uri": model_uri,
      |        "registered_model": _SH_REGISTER_AS or "",
      |        "model_version": version,
      |        "tracking_uri": mlflow.get_tracking_uri(),
      |    }], spark, "the MLflow result")
      |""".stripMargin
}
