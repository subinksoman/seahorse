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
import ai.deepsense.deeplang.doperations.layout.SmallBlockLayout2To3
import ai.deepsense.deeplang.inference.{InferContext, InferenceWarnings}
import ai.deepsense.deeplang.params.{CodeSnippetLanguage, CodeSnippetParam, Param}
import ai.deepsense.deeplang.{DKnowledge, DOperation2To3, ExecutionContext}
import ai.deepsense.customops.python.{PythonOperationRunner, PythonShim}
import ai.deepsense.customops.doperables.MlflowModel

/**
 * Two input DataFrames, two output DataFrames: `def transform(df1, df2)` returns two values, one
 * per output port. Each may independently be a list of objects, a list of tuples, a Spark
 * DataFrame or a pandas DataFrame.
 *
 * A third output port carries an [[MlflowModel]] whenever the code calls the injected
 * `save_model(...)`; it is empty otherwise.
 *
 * Input port 0 and output port 0 use the executor's normal channel; input port 1 and output port 1
 * travel as global temp views. See [[PythonShim]].
 */
final class PythonTransformation2To2
  extends DOperation2To3[DataFrame, DataFrame, DataFrame, DataFrame, MlflowModel]
  with SmallBlockLayout2To3 {

  override val id: Id = "b8e41d52-7c93-4a6f-9d18-25f0c7b3ae64"

  override val name: String = "Transformation 2 To 2"

  override val description: String =
    "Runs custom Python code over two input DataFrames and returns two DataFrames, plus any " +
      "model the code saved with save_model()"

  val codeParameter = CodeSnippetParam(
    name = "code",
    description = Some(
      "Python code defining `transform(df1, df2)`. `df1` is the left input DataFrame, `df2` the " +
        "right one. Return two values, one per output port — `return first, second` — where each " +
        "is a list of objects (dicts, dataclasses, named tuples, pydantic models, Rows), a list " +
        "of tuples, a Spark DataFrame or a pandas DataFrame."),
    language = CodeSnippetLanguage(CodeSnippetLanguage.python))
  setDefault(codeParameter,
    """def transform(df1, df2):
      |    return df1, df2
      |""".stripMargin)

  def getCodeParameter: String = $(codeParameter)
  def setCodeParameter(value: String): this.type = set(codeParameter, value)

  override def specificParams: Array[Param[_]] = Array(codeParameter)

  override protected def execute(
      left: DataFrame,
      right: DataFrame)(
      ctx: ExecutionContext): (DataFrame, DataFrame, MlflowModel) = {
    val runner = new PythonOperationRunner(ctx)
    val result = runner.run(
      Seq(left, right), renderCode(runner.modelCapture), PythonShim.extraOutputViews(runner.nodeId, 1),
      collectModel = true)
    (result.dataFrames.head, result.dataFrames(1), result.model)
  }

  private[customops] def renderCode(capture: PythonShim.ModelCapture): String =
    PythonShim.assemble(
      Some(getCodeParameter),
      Some(PythonShim.rightInputView(capture.nodeId)),
      PythonShim.extraOutputViews(capture.nodeId, 1),
      model = Some(capture),
      entryPoint = """
        |def transform(dataframe):
        |    _sh_check_arity(_sh_user_transform, 2, "transform(df1, df2)")
        |    df2 = spark.table(_sh_right_view)
        |    first, second = _sh_split_outputs(_sh_user_transform(dataframe, df2), 2)
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
      leftKnowledge: DKnowledge[DataFrame],
      rightKnowledge: DKnowledge[DataFrame])(
      ctx: InferContext): ((DKnowledge[DataFrame], DKnowledge[DataFrame],
        DKnowledge[MlflowModel]), InferenceWarnings) =
    ((DKnowledge(DataFrame.forInference()), DKnowledge(DataFrame.forInference()),
      DKnowledge(MlflowModel.Empty)), InferenceWarnings.empty)

  @transient override lazy val tTagTI_0: ru.TypeTag[DataFrame] = ru.typeTag[DataFrame]
  @transient override lazy val tTagTI_1: ru.TypeTag[DataFrame] = ru.typeTag[DataFrame]
  @transient override lazy val tTagTO_0: ru.TypeTag[DataFrame] = ru.typeTag[DataFrame]
  @transient override lazy val tTagTO_1: ru.TypeTag[DataFrame] = ru.typeTag[DataFrame]
  @transient override lazy val tTagTO_2: ru.TypeTag[MlflowModel] = ru.typeTag[MlflowModel]
}
