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
import ai.deepsense.deeplang.doperations.layout.SmallBlockLayout2To2
import ai.deepsense.deeplang.inference.{InferContext, InferenceWarnings}
import ai.deepsense.deeplang.params.{CodeSnippetLanguage, CodeSnippetParam, Param}
import ai.deepsense.deeplang.{DKnowledge, DOperation2To2, ExecutionContext}
import ai.deepsense.customops.python.{PythonOperationRunner, PythonShim}
import ai.deepsense.customops.doperables.MlflowModel

/**
 * Two input DataFrames, one output DataFrame: `def transform(df1, df2)` returns that DataFrame —
 * a Spark or pandas DataFrame. A list of objects (dicts, dataclasses, named tuples, pydantic
 * models, Rows), a list of tuples or a pandas Series is also accepted and becomes its rows.
 *
 * A second output port carries an [[MlflowModel]] whenever the code calls the injected
 * `save_model(...)`; it is empty otherwise.
 *
 * `df1` arrives through the normal port-0 channel; `df2` is handed over as a global temp view.
 * See [[PythonShim]] for why.
 */
final class PythonTransformation2To1
  extends DOperation2To2[DataFrame, DataFrame, DataFrame, MlflowModel]
  with SmallBlockLayout2To2 {

  override val id: Id = "3c6f7d19-1a48-4d33-9c7a-6f5e0b2c8a41"

  override val name: String = "Transformation 2 To 1"

  override val description: String =
    "Runs custom Python code over two input DataFrames and returns one DataFrame, plus any " +
      "model the code saved with save_model()"

  val codeParameter = CodeSnippetParam(
    name = "code",
    description = Some(
      "Python code defining `transform(df1, df2)`. `df1` is the left input DataFrame, `df2` the " +
        "right one. Return one DataFrame — Spark or pandas. A list of objects (dicts, " +
        "dataclasses, named tuples, pydantic models, Rows), a list of tuples or a pandas Series " +
        "is also accepted and becomes the output's rows."),
    language = CodeSnippetLanguage(CodeSnippetLanguage.python))
  setDefault(codeParameter,
    """def transform(df1, df2):
      |    return df1
      |""".stripMargin)

  def getCodeParameter: String = $(codeParameter)
  def setCodeParameter(value: String): this.type = set(codeParameter, value)

  override def specificParams: Array[Param[_]] = Array(codeParameter)

  override protected def execute(
      left: DataFrame,
      right: DataFrame)(
      ctx: ExecutionContext): (DataFrame, MlflowModel) = {
    val runner = new PythonOperationRunner(ctx)
    val result = runner.run(
      Seq(left, right), renderCode(runner.modelCapture), extraViews = Nil, collectModel = true)
    (result.dataFrames.head, result.model)
  }

  private[customops] def renderCode(capture: PythonShim.ModelCapture): String =
    PythonShim.assemble(
      Some(getCodeParameter),
      Some(PythonShim.rightInputView(capture.nodeId)),
      extraOutputViews = Nil,
      model = Some(capture),
      entryPoint = """
        |def transform(dataframe):
        |    _sh_check_arity(_sh_user_transform, 2, "transform(df1, df2)")
        |    df2 = spark.table(_sh_right_view)
        |    result = _sh_to_dataframe(_sh_user_transform(dataframe, df2), spark)
        |    _sh_publish_model(spark)
        |    return result
        |""".stripMargin)

  /** The output schema only exists once the Python has run, exactly as for `PythonTransformation`. */
  override protected def inferKnowledge(
      leftKnowledge: DKnowledge[DataFrame],
      rightKnowledge: DKnowledge[DataFrame])(
      ctx: InferContext): ((DKnowledge[DataFrame], DKnowledge[MlflowModel]), InferenceWarnings) =
    ((DKnowledge(DataFrame.forInference()), DKnowledge(MlflowModel.Empty)),
      InferenceWarnings.empty)

  @transient override lazy val tTagTI_0: ru.TypeTag[DataFrame] = ru.typeTag[DataFrame]
  @transient override lazy val tTagTI_1: ru.TypeTag[DataFrame] = ru.typeTag[DataFrame]
  @transient override lazy val tTagTO_0: ru.TypeTag[DataFrame] = ru.typeTag[DataFrame]
  @transient override lazy val tTagTO_1: ru.TypeTag[MlflowModel] = ru.typeTag[MlflowModel]
}
