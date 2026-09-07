package ai.deepsense.customops

import ai.deepsense.customops.doperables.MlflowModel
import ai.deepsense.customops.doperations._
import ai.deepsense.customops.python.PythonShim

/**
 * Dev utility: renders the Python each operation submits — the same `PythonShim.assemble` path
 * execution uses — so the shim can be checked with a real interpreter.
 * `sbt "customops/Test/runMain ai.deepsense.customops.DumpGeneratedCode <outDir> [userCode.py]"`.
 */
object DumpGeneratedCode {
  private val NodeId = "aa-bb-11"
  private val WorkflowId = "wf-42"

  private val capture =
    PythonShim.ModelCapture(WorkflowId, NodeId, PythonShim.modelView(NodeId))

  def main(args: Array[String]): Unit = {
    val outDir = java.nio.file.Paths.get(args(0))
    java.nio.file.Files.createDirectories(outDir)
    val userCode = if (args.length > 1) Some(scala.io.Source.fromFile(args(1)).mkString) else None

    val op1to2 = new PythonTransformation1To2()
    userCode.foreach(op1to2.setCodeParameter)
    write(outDir.resolve("gen_1to2.py"), op1to2.renderCode(capture))

    val op2to1 = new PythonTransformation2To1()
    userCode.foreach(op2to1.setCodeParameter)
    write(outDir.resolve("gen_2to1.py"), op2to1.renderCode(capture))

    val op2to2 = new PythonTransformation2To2()
    userCode.foreach(op2to2.setCodeParameter)
    write(outDir.resolve("gen_2to2.py"), op2to2.renderCode(capture))

    val push = new PushToMlflow()
      .setRegisteredModelName("churn")
    write(outDir.resolve("gen_mlflow_push.py"), push.renderCode(MlflowModel(
      modelPath = "/library/seahorse-models/wf-42/aa-bb-11",
      flavor = "sklearn",
      metricsJson = """{"auc": 0.83}""",
      paramsJson = """{"n_estimators": "100"}""")))

    val predict = new MlflowPredict().setModelName("churn").setModelVersion("")
    write(outDir.resolve("gen_mlflow_predict.py"), predict.renderCode())

    println(s"wrote 5 scripts to $outDir")
  }

  private def write(path: java.nio.file.Path, code: String): Unit =
    java.nio.file.Files.write(path, code.getBytes("UTF-8"))
}
