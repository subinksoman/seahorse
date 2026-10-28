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

import ai.deepsense.customops.python.{PythonOperationRunner, PythonShim}
import ai.deepsense.deeplang.DOperation.Id
import ai.deepsense.deeplang.doperables.dataframe.DataFrame
import ai.deepsense.deeplang.exceptions.DeepLangException
import ai.deepsense.deeplang.inference.{InferContext, InferenceWarnings}
import ai.deepsense.deeplang.params.{Param, StringParam}
import ai.deepsense.deeplang.{DKnowledge, DOperation1To1, ExecutionContext}

/**
 * Logs metrics against a model already in the Model Registry, selected the way
 * [[MlflowPredict]] selects one: by name and version or alias, with no need for the training
 * node to be in this workflow.
 *
 * MLflow attaches metrics to **runs**, not to model versions, so the version is resolved to the
 * run that produced it and the metrics go there — which is what the version's page displays. A
 * version registered from a path rather than a run has nowhere to put them, and says so.
 *
 * The input DataFrame is read in whichever of the two shapes it is in:
 *
 *  - **long** — a metric-name column (`metric`, `metric_name`, `name` or `key`) and a value
 *    column (`value` or `metric_value`), one row per metric
 *  - **wide** — one row, every numeric column a metric named after the column
 *
 * Logging the same key again appends to the metric's history; the version's page shows the
 * latest. Every push is read back off the run before the node reports success, so a tracking
 * store that accepts a write without keeping it fails here rather than downstream. Pushing takes
 * no code — the whole MLflow script is generated.
 */
final class PushMetricsToMlflow extends DOperation1To1[DataFrame, DataFrame] {

  override val id: Id = "d085d889-c6d2-423d-ba7b-316d8223d59e"

  override val name: String = "MLFLOWPUSH metrics"

  override val description: String =
    "Logs the metrics in the input DataFrame against a registered model version's run"

  val modelName = StringParam(
    name = "model name",
    description = Some(
      "Registered model name in the MLflow Model Registry, e.g. `churn`."))
  setDefault(modelName, "")

  val modelVersion = StringParam(
    name = "version or alias",
    description = Some(
      "Which version of the registered model: a number (`3`), an alias (`champion`), or empty " +
        "for the latest version."))
  setDefault(modelVersion, "")

  def getModelName: String = $(modelName)
  def setModelName(value: String): this.type = set(modelName, value)

  def getModelVersion: String = $(modelVersion)
  def setModelVersion(value: String): this.type = set(modelVersion, value)

  override def specificParams: Array[Param[_]] =
    Array(modelName, modelVersion)

  override protected def customValidateParams: Vector[DeepLangException] =
    if (getModelName.trim.isEmpty) {
      Vector(new DeepLangException(
        "'model name' must name a model in the MLflow Model Registry"))
    } else {
      Vector.empty
    }

  override protected def execute(metrics: DataFrame)(ctx: ExecutionContext): DataFrame = {
    val runner = new PythonOperationRunner(ctx)
    runner.run(Seq(metrics), renderCode(), extraViews = Nil).dataFrames.head
  }

  private[customops] def renderCode(): String = {
    def literal(value: String) = PythonShim.stringLiteral(Some(value.trim).filter(_.nonEmpty))
    PythonShim.assemble(
      userCode = None,
      rightInputView = None,
      extraOutputViews = Nil,
      model = None,
      entryPoint = s"""
         |_SH_MODEL_NAME = ${literal(getModelName)}
         |_SH_MODEL_VERSION = ${literal(getModelVersion)}
         |""".stripMargin + PythonShim.registryHelpers +
         PushMetricsToMlflow.metricsScript)
  }

  /** Column names are fixed, so downstream nodes see them before the run happens. */
  override protected def inferKnowledge(
      metricsKnowledge: DKnowledge[DataFrame])(
      ctx: InferContext): (DKnowledge[DataFrame], InferenceWarnings) =
    (DKnowledge(DataFrame.forInference(PushMetricsToMlflow.OutputSchema)),
      InferenceWarnings.empty)

  @transient override lazy val tTagTI_0: ru.TypeTag[DataFrame] = ru.typeTag[DataFrame]
  @transient override lazy val tTagTO_0: ru.TypeTag[DataFrame] = ru.typeTag[DataFrame]
}

object PushMetricsToMlflow {

  val OutputColumns: Seq[String] = Seq(
    "model_name", "model_version", "run_id", "experiment_id", "metrics", "metric_count",
    "skipped_columns", "validated", "tracking_uri")

  val OutputSchema: StructType =
    StructType(OutputColumns.map(StructField(_, StringType, nullable = false)))

  /** Every value in the result is a string: an absent column would be all-null and unschemable. */
  private[customops] val metricsScript: String =
    """
      |_SH_MAX_ROWS = 1000
      |_SH_NAME_COLUMNS = ("metric", "metric_name", "name", "key")
      |_SH_VALUE_COLUMNS = ("value", "metric_value")
      |
      |
      |def _sh_metrics_pair(columns):
      |    lower = {}
      |    for column in columns:
      |        lower.setdefault(str(column).strip().lower(), column)
      |    name = next((lower[c] for c in _SH_NAME_COLUMNS if c in lower), None)
      |    value = next((lower[c] for c in _SH_VALUE_COLUMNS if c in lower), None)
      |    if name is None or value is None:
      |        return None
      |    return name, value
      |
      |
      |def _sh_metrics_long(frame, pair):
      |    name_column, value_column = pair
      |    metrics, unnamed, bad = {}, 0, []
      |    for position in range(len(frame)):
      |        row = frame.iloc[position]
      |        key = row[name_column]
      |        if key is None or str(key).strip() == "":
      |            unnamed += 1
      |            continue
      |        key = str(key).strip()
      |        try:
      |            metrics[key] = float(row[value_column])
      |        except (TypeError, ValueError):
      |            bad.append(key)
      |    if bad:
      |        raise Exception(
      |            "These metrics have a non-numeric '" + str(value_column) + "', so MLflow "
      |            "cannot log them: " + ", ".join(sorted(set(bad))) + ".")
      |    if unnamed:
      |        raise Exception(
      |            str(unnamed) + " row(s) have an empty '" + str(name_column) + "', so those "
      |            "metrics have no name. Drop them, or give each one a name.")
      |    return metrics, []
      |
      |
      |def _sh_metrics_wide(frame):
      |    if len(frame) != 1:
      |        raise Exception(
      |            "The input has " + str(len(frame)) + " rows and no metric-name/value column "
      |            "pair, so it is read as a single row of named metrics and the other rows "
      |            "would be dropped. Give it one row, or name two columns "
      |            + " / ".join(_SH_NAME_COLUMNS[:1] + _SH_VALUE_COLUMNS[:1]) + ".")
      |    row = frame.iloc[0]
      |    metrics, skipped = {}, []
      |    for column in frame.columns:
      |        try:
      |            metrics[str(column)] = float(row[column])
      |        except (TypeError, ValueError):
      |            skipped.append(str(column))
      |    if not metrics:
      |        raise Exception(
      |            "No column of the input holds a number, so there is nothing to log: "
      |            + ", ".join(skipped) + ".")
      |    return metrics, skipped
      |
      |
      |def _sh_metrics_read(dataframe):
      |    frame = dataframe.limit(_SH_MAX_ROWS + 1).toPandas()
      |    if len(frame) > _SH_MAX_ROWS:
      |        raise Exception(
      |            "The input has more than " + str(_SH_MAX_ROWS) + " rows. This node logs a "
      |            "metric per row, not a dataset - aggregate it first.")
      |    if len(frame) == 0:
      |        raise Exception("The input DataFrame is empty, so there are no metrics to log.")
      |    pair = _sh_metrics_pair(frame.columns)
      |    if pair is not None:
      |        return _sh_metrics_long(frame, pair)
      |    return _sh_metrics_wide(frame)
      |
      |
      |def transform(dataframe):
      |    import json
      |
      |    mlflow = _sh_registry_mlflow()
      |    metrics, skipped = _sh_metrics_read(dataframe)
      |
      |    client = mlflow.MlflowClient()
      |    version = _sh_registry_version(client)
      |    run_id = getattr(version, "run_id", None)
      |    if not run_id:
      |        raise Exception(
      |            "Version " + str(version.version) + " of '" + _SH_MODEL_NAME + "' was not "
      |            "produced by a run - it was registered straight from a path - so it has no "
      |            "run for metrics to live on. Re-register it from a run, or log these metrics "
      |            "to a run of their own.")
      |
      |    # client.log_metric writes into an existing run without reopening it, so a FINISHED
      |    # run stays FINISHED. mlflow.start_run(run_id=...) would cycle its status.
      |    for key in sorted(metrics):
      |        try:
      |            client.log_metric(run_id, key, metrics[key])
      |        except Exception as error:
      |            raise Exception(
      |                "Logging '" + key + "' to run " + run_id + " failed (" + str(error)
      |                + "). A metric key may not contain a path separator, and the tracking "
      |                "store must be writable.")
      |
      |    # Read the run back rather than trust the writes: a tracking store can accept a
      |    # log_metric call and still not hold it, and a silently-empty push is the one
      |    # failure mode nobody notices until the dashboard is wrong.
      |    try:
      |        run = client.get_run(run_id)
      |    except Exception as error:
      |        raise Exception(
      |            "Logged " + str(len(metrics)) + " metric(s) to run " + run_id + ", but "
      |            "reading the run back to confirm them failed (" + str(error) + ").")
      |    recorded = dict(getattr(run.data, "metrics", None) or {})
      |    missing = sorted(
      |        key for key in metrics
      |        if key not in recorded or abs(float(recorded[key]) - metrics[key]) > 1e-9)
      |    if missing:
      |        raise Exception(
      |            "MLflow accepted the metrics but run " + run_id + " does not report them "
      |            "back: " + ", ".join(missing) + ". The tracking store may be read-only, or "
      |            "pointing somewhere other than the registry the model came from.")
      |    experiment_id = run.info.experiment_id
      |
      |    return _sh_to_dataframe([{
      |        "model_name": _SH_MODEL_NAME,
      |        "model_version": str(version.version),
      |        "run_id": run_id,
      |        "experiment_id": str(experiment_id),
      |        "metrics": json.dumps(metrics, sort_keys=True),
      |        "metric_count": str(len(metrics)),
      |        "skipped_columns": ", ".join(skipped),
      |        "validated": "read back " + str(len(metrics)) + " of "
      |                     + str(len(metrics)) + " from run " + run_id,
      |        "tracking_uri": mlflow.get_tracking_uri(),
      |    }], spark, "the MLflow result")
      |""".stripMargin
}
