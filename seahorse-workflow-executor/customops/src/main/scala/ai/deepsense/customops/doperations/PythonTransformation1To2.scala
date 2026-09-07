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

import ai.deepsense.deeplang.DOperation.Id
import ai.deepsense.deeplang.doperables.dataframe.DataFrame
import ai.deepsense.deeplang.inference.{InferContext, InferenceWarnings}
import ai.deepsense.deeplang.params.{CodeSnippetLanguage, CodeSnippetParam, Param}
import ai.deepsense.deeplang.{DKnowledge, DOperation1To3, ExecutionContext}
import ai.deepsense.customops.python.{PythonOperationRunner, PythonShim}
import ai.deepsense.customops.doperables.MlflowModel

/**
 * One input DataFrame, two output DataFrames: `def transform(df)` returns two values, one per
 * output port. Each may independently be a Spark or pandas DataFrame, a pandas Series, a list of
 * objects or a list of tuples.
 *
 * Splitting features from labels is the typical use: `return X, y`.
 *
 * A third output port carries an [[MlflowModel]] whenever the code calls the injected
 * `save_model(...)`; it is empty otherwise.
 *
 * The input and output port 0 use the executor's normal channel; output port 1 travels as a global
 * temp view. See [[PythonShim]].
 */
final class PythonTransformation1To2
  extends DOperation1To3[DataFrame, DataFrame, DataFrame, MlflowModel] {

  override val id: Id = "7d2b4f86-3e15-4c9a-8b47-0a6e91d5c728"

  override val name: String = "Transformation 1 To 2"

  override val description: String =
    "Runs custom Python code over one input DataFrame and returns two DataFrames, plus any " +
      "model the code saved with save_model()"

  val codeParameter = CodeSnippetParam(
    name = "code",
    description = Some(
      "Python code defining `transform(df)`. Return two values, one per output port — " +
        "`return first, second` — where each is a DataFrame (Spark or pandas), a pandas Series, " +
        "a list of objects (dicts, dataclasses, named tuples, pydantic models, Rows) or a list " +
        "of tuples."),
    language = CodeSnippetLanguage(CodeSnippetLanguage.python))
  setDefault(codeParameter,
    """def transform(df):
      |    return df, df
      |""".stripMargin)

  def getCodeParameter: String = $(codeParameter)
  def setCodeParameter(value: String): this.type = set(codeParameter, value)

  override def specificParams: Array[Param[_]] = Array(codeParameter)

  override protected def execute(
      input: DataFrame)(
      ctx: ExecutionContext): (DataFrame, DataFrame, MlflowModel) = {
    val runner = new PythonOperationRunner(ctx)
    val result = runner.run(
      Seq(input), renderCode(runner.modelCapture), PythonShim.extraOutputViews(runner.nodeId, 1),
      collectModel = true)
    (result.dataFrames.head, result.dataFrames(1), result.model)
  }

  private[customops] def renderCode(capture: PythonShim.ModelCapture): String =
    PythonShim.assemble(
      Some(getCodeParameter),
      rightInputView = None,                             // one input: nothing to hand over
      PythonShim.extraOutputViews(capture.nodeId, 1),
      model = Some(capture),
      entryPoint = """
        |def transform(dataframe):
        |    _sh_check_arity(_sh_user_transform, 1, "transform(df)")
        |    first, second = _sh_split_outputs(_sh_user_transform(dataframe), 2)
        |    # Output port 1 has no channel of its own, so hand it over as a global temp view.
        |    _sh_to_spark_dataframe(
        |        second, spark, "the second returned value"
        |    ).createOrReplaceGlobalTempView(_sh_extra_out_views[0])
        |    result = _sh_to_dataframe(first, spark, "the first returned value")
        |    _sh_publish_model(spark)
        |    return result
        |""".stripMargin)

  /** Both output schemas only exist once the Python has run. */
  override protected def inferKnowledge(
      inputKnowledge: DKnowledge[DataFrame])(
      ctx: InferContext): ((DKnowledge[DataFrame], DKnowledge[DataFrame],
        DKnowledge[MlflowModel]), InferenceWarnings) =
    ((DKnowledge(DataFrame.forInference()), DKnowledge(DataFrame.forInference()),
      DKnowledge(MlflowModel.Empty)), InferenceWarnings.empty)

  @transient override lazy val tTagTI_0: ru.TypeTag[DataFrame] = ru.typeTag[DataFrame]
  @transient override lazy val tTagTO_0: ru.TypeTag[DataFrame] = ru.typeTag[DataFrame]
  @transient override lazy val tTagTO_1: ru.TypeTag[DataFrame] = ru.typeTag[DataFrame]
  @transient override lazy val tTagTO_2: ru.TypeTag[MlflowModel] = ru.typeTag[MlflowModel]
}
