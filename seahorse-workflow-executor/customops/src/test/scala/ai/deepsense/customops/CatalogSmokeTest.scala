package ai.deepsense.customops

import java.io.File

import ai.deepsense.customops.catalogs.SixDeeCategory
import ai.deepsense.customops.doperables.MlflowModel
import ai.deepsense.customops.doperations._
import ai.deepsense.deeplang.CatalogRecorder

/**
 * Dev utility: proves the packaged jar registers the way the running system loads it — the
 * `CatalogRegistrant` service file discovered by `CatalogRecorder` over a jars directory, with the
 * operations landing in the plugin's own category rather than `User defined`, and the plugin's
 * `MlflowModel` present in the operable catalog so the editor can type-check the port.
 * `sbt "customops/Test/runMain ai.deepsense.customops.CatalogSmokeTest <jarsDir>"`.
 *
 * Names are read from the classes themselves, so renaming anything in the palette does not break
 * this check.
 */
object CatalogSmokeTest {
  private val category = SixDeeCategory.name

  private val expected = Seq(
    new PythonTransformation1To2(),
    new PythonTransformation2To1(),
    new PythonTransformation2To2(),
    new PushToMlflow(),
    new MlflowPredict()).map(op => (op.id, op.name))

  def main(args: Array[String]): Unit = {
    val catalogs = CatalogRecorder.fromDir(new File(args(0))).catalogs
    val catalog = catalogs.operations

    val categories = catalog.categoryTree.getCategories.map(_.name)
    println("categories: " + categories.mkString(", "))
    require(categories.contains(category), s"'$category' category is missing from the tree")

    val operableNames = catalogs.operables.descriptor.traits.keySet ++
      catalogs.operables.descriptor.classes.keySet
    val modelType = classOf[MlflowModel].getName
    require(operableNames.contains(modelType),
      s"$modelType is not in the operable catalog, so the editor cannot type-check the model port")
    println(s"operable registered: $modelType")

    for ((id, name) <- expected) {
      val descriptor = catalog.operations.getOrElse(id,
        throw new IllegalStateException(s"'$name' (id $id) is not registered"))
      require(descriptor.name == name,
        s"id $id is registered as '${descriptor.name}', but the class says '$name'")
      require(descriptor.category.name == category,
        s"'$name' landed in '${descriptor.category.name}', expected '$category'")

      val op = catalog.createDOperation(id)
      op.validate()
      println(s"${op.name}  id=${op.id}")
      println(s"    in : ${op.inPortTypes.map(shortName).mkString(", ")} " +
        s"[${op.inPortsLayout.mkString(",")}]")
      println(s"    out: ${op.outPortTypes.map(shortName).mkString(", ")} " +
        s"[${op.outPortsLayout.mkString(",")}]")
      println(s"    params: ${op.params.map(_.name).mkString(", ")}")

      // Names reach the palette verbatim, so catch the kind of typo that is invisible there.
      require(!op.name.contains("  "), s"'${op.name}' contains a double space")
      require(op.name.trim == op.name, s"'${op.name}' has leading/trailing whitespace")
    }

    require(!catalog.operations.values.exists(_.category.name == "User defined"),
      "something registered into 'User defined' - is @Register still on an operation?")
    val inCategory = catalog.operations.values.count(_.category.name == category)
    require(inCategory == expected.size,
      s"'$category' holds $inCategory operations but ${expected.size} were expected")
    println(s"nothing in 'User defined'; $inCategory operations registered in '$category'")
  }

  private def shortName(tag: scala.reflect.runtime.universe.TypeTag[_]): String =
    tag.tpe.toString.split('.').last
}
