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
import ai.deepsense.deeplang.exceptions.DeepLangException
import ai.deepsense.deeplang.inference.{InferContext, InferenceWarnings}
import ai.deepsense.deeplang.params.validators.RangeValidator
import ai.deepsense.deeplang.params.{NumericParam, Param, StringParam}
import ai.deepsense.deeplang.{DKnowledge, DOperation3To1, ExecutionContext}

/**
 * [[PushToMlflow]] plus a model signature inferred from two example DataFrames.
 *
 * MLflow renders a model version's **Schema → Inputs / Outputs** panel entirely from the
 * `signature:` block of the MLmodel file, and `save_model()` only writes one when the training
 * code passed `input_example=`. Training code that did not leaves the panel blank, and the model
 * is also intolerant of extra columns at scoring time, because MLflow has no declared input list
 * to select by.
 *
 * Rather than ask for the training data back, this node takes the two frames that describe the
 * contract directly:
 *
 *  - input port 0 — the [[MlflowModel]]
 *  - input port 1 — the model's **inputs**: one row per observation, the feature columns
 *  - input port 2 — the model's **outputs**: the predictions or labels
 *
 * Every column of both frames goes into the signature, so port 2 wants the predictions on their
 * own — a `Transform` node's output carries the features alongside them and would declare those
 * as outputs too. Project it down first.
 *
 * The sample read from port 1 is also logged to the run as a CSV under `data/`, so the data the
 * signature was built from is there to read next to the model it describes.
 *
 * Only the copy uploaded to MLflow gets the signature. The artifact the training node wrote under
 * `SEAHORSE_MODEL_DIR` is read, never modified, so re-running this node cannot corrupt a model
 * other nodes are reading.
 */
final class PushToMlflowWithSignature
  extends DOperation3To1[MlflowModel, DataFrame, DataFrame, DataFrame] {

  override val id: Id = "b6874ac8-a72b-4af8-a3ab-7b7c76e8b717"

  override val name: String = "Push To MLflow With Signature"

  override val description: String =
    "Logs the model on input port 0 to MLflow with a signature inferred from the input DataFrame " +
      "on port 1 and the output DataFrame on port 2, and optionally registers it"

  val registeredModelName = StringParam(
    name = "registered model name",
    description = Some(
      "Register the logged model in the MLflow Model Registry under this name. Leave empty to " +
        "log the run without registering. The registry needs a database-backed or HTTP tracking " +
        "URI; a plain file store cannot register models."))
  setDefault(registeredModelName, "")

  val inputFileName = StringParam(
    name = "input file name",
    description = Some(
      "Name of the CSV the input sample is logged as, under the run's `data/` folder. Leave " +
        "empty for the registered model name, e.g. `data/churn.csv`. A `.csv` suffix is added " +
        "if it is missing."))
  setDefault(inputFileName, "")

  val sampleRows = NumericParam(
    name = "sample rows",
    description = Some(
      "How many rows to read from each DataFrame. A signature records column names and types, " +
        "not data, so a small sample is enough and keeps the collect off the driver's heap."),
    validator = RangeValidator.positiveIntegers)
  setDefault(sampleRows, 1000.0)

  def getRegisteredModelName: String = $(registeredModelName)
  def setRegisteredModelName(value: String): this.type = set(registeredModelName, value)

  def getInputFileName: String = $(inputFileName)
  def setInputFileName(value: String): this.type = set(inputFileName, value)

  def getSampleRows: Int = $(sampleRows).toInt
  def setSampleRows(value: Int): this.type = set(sampleRows, value.toDouble)

  override def specificParams: Array[Param[_]] =
    Array(registeredModelName, inputFileName, sampleRows)

  override protected def customValidateParams: Vector[DeepLangException] =
    if (getSampleRows < 1) {
      Vector(new DeepLangException("'sample rows' must be at least 1"))
    } else {
      Vector.empty
    }

  override protected def execute(
      model: MlflowModel,
      inputs: DataFrame,
      outputs: DataFrame)(
      ctx: ExecutionContext): DataFrame = {
    if (!model.isDefined) {
      throw CustomOperationExecutionException(
        "The model port carries no model. The Python transformation feeding this node must call " +
          "save_model(model, metrics=..., params=...) — saving a model is optional there, but " +
          "this node has nothing to push without it.")
    }
    val runner = new PythonOperationRunner(ctx)
    runner.run(
      inputs = Seq(inputs, outputs),
      renderCode(model, PythonShim.rightInputView(runner.nodeId)),
      extraViews = Nil).dataFrames.head
  }

  private[customops] def renderCode(model: MlflowModel, rightView: String): String = {
    def literal(value: String) = PythonShim.stringLiteral(Some(value.trim).filter(_.nonEmpty))
    PythonShim.assemble(
      userCode = None,
      rightInputView = Some(rightView),
      extraOutputViews = Nil,
      model = None,
      entryPoint = PythonShim.artifactErrorHelper + s"""
        |_SH_REGISTER_AS = ${literal(getRegisteredModelName)}
        |_SH_MODEL_PATH = ${literal(model.getModelPath)}
        |_SH_MODEL_FLAVOR = ${literal(model.getFlavor)}
        |_SH_METRICS_JSON = ${literal(model.getMetricsJson)}
        |_SH_PARAMS_JSON = ${literal(model.getParamsJson)}
        |_SH_INPUT_FILE = ${literal(getInputFileName)}
        |_SH_SAMPLE_ROWS = ${getSampleRows}
        |""".stripMargin +
        PythonShim.signatureHelpers + PushToMlflow.pushHelpers +
        PushToMlflowWithSignature.signatureScript)
  }

  override protected def inferKnowledge(
      modelKnowledge: DKnowledge[MlflowModel],
      inputsKnowledge: DKnowledge[DataFrame],
      outputsKnowledge: DKnowledge[DataFrame])(
      ctx: InferContext): (DKnowledge[DataFrame], InferenceWarnings) =
    (DKnowledge(DataFrame.forInference(PushToMlflowWithSignature.OutputSchema)),
      InferenceWarnings.empty)

  @transient override lazy val tTagTI_0: ru.TypeTag[MlflowModel] = ru.typeTag[MlflowModel]
  @transient override lazy val tTagTI_1: ru.TypeTag[DataFrame] = ru.typeTag[DataFrame]
  @transient override lazy val tTagTI_2: ru.TypeTag[DataFrame] = ru.typeTag[DataFrame]
  @transient override lazy val tTagTO_0: ru.TypeTag[DataFrame] = ru.typeTag[DataFrame]
}

object PushToMlflowWithSignature {

  /** [[PushToMlflow]]'s row, plus what the signature declared and where the sample landed. */
  val OutputColumns: Seq[String] =
    PushToMlflow.OutputColumns ++ Seq("signature_inputs", "signature_outputs", "input_file")

  val OutputSchema: StructType =
    StructType(OutputColumns.map(StructField(_, StringType, nullable = false)))

  /** Appended to [[PushToMlflow.pushHelpers]], which supplies `_sh_push_to_mlflow`. */
  /** Appended to the shared helpers, which supply the signature and the push. */
  private[customops] val signatureScript: String =
    """
      |def transform(dataframe):
      |    import os
      |    import shutil
      |    import tempfile
      |
      |    _sh_push_mlflow()
      |    _sh_push_require_model(_SH_MODEL_PATH)
      |
      |    outputs = spark.table(_sh_right_view)
      |    inputs_frame = _sh_sig_sample(dataframe, _SH_SAMPLE_ROWS, "the input DataFrame")
      |    signature = _sh_sig_infer(
      |        inputs_frame,
      |        _sh_sig_sample(outputs, _SH_SAMPLE_ROWS, "the output DataFrame"))
      |
      |    # The signature goes on a copy, so the artifact the training node wrote stays exactly
      |    # as it was written.
      |    staging = tempfile.mkdtemp(prefix="sh-mlflow-signature-")
      |    try:
      |        staged = os.path.join(staging, "model")
      |        shutil.copytree(_SH_MODEL_PATH, staged)
      |        _sh_sig_write(staged, signature)
      |        # Staged beside the model copy, not inside it: an unexpected file in a model
      |        # directory is not something MLflow's loaders promise to ignore. In the run it
      |        # lands under data/, next to model/.
      |        filename = _sh_sig_filename(_SH_INPUT_FILE, _sh_push_experiment())
      |        csv = _sh_sig_write_csv(inputs_frame, staging, filename)
      |        return _sh_push_to_mlflow(
      |            artifact_dir=staged,
      |            extra_artifacts=[(csv, _SH_INPUT_DIR)],
      |            extra_tags={"seahorse.signature": "inferred"},
      |            extra_columns={
      |                "signature_inputs": _sh_sig_describe(signature.inputs),
      |                "signature_outputs": _sh_sig_describe(signature.outputs),
      |                "input_file": _SH_INPUT_DIR + "/" + filename,
      |            })
      |    finally:
      |        shutil.rmtree(staging, ignore_errors=True)
      |""".stripMargin
}
