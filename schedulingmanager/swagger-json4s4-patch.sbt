// T42 (Spark 4.x): the external scalatra-swagger-codegen 1.7 plugin emits json4s-3 idioms into the
// generated DefaultApi.scala that don't compile against json4s 4.0 (which Spark 4.x bundles):
//   * DefaultFormats.losslessDate()  -> removed/inaccessible in 4.0
//   * case MappingException(_, ex)   -> MappingException is no longer a case class (no unapply)
// Rewrite those to json4s-4 equivalents after codegen, before compile. Guarded to Spark 4.x so the
// 3.4.4 build (json4s 3.7, where the original code is correct) is untouched. Idempotent, and
// path-agnostic (globs every generated DefaultApi.scala) so the same file works for any codegen
// module. Also skip scaladoc on the generated sources (the docker/publish chain runs `doc`, which
// would otherwise recompile the generated code independently of the compile patch).

val patchSwaggerForJson4s4 = taskKey[Unit](
  "Rewrite generated json4s-3 constructs to json4s-4 in swagger DefaultApi.scala (Spark 4.x only)")

Compile / patchSwaggerForJson4s4 := {
  val log = streams.value.log
  val is4x = sys.props.getOrElse("SPARK_VERSION", "4.2.0").startsWith("4.")
  if (is4x) {
    val genRoot = (Compile / sourceManaged).value / "swagger-generated"
    val files = (genRoot ** "DefaultApi.scala").get
    files.foreach { f =>
      val orig = IO.read(f)
      var c = orig
      c = c.replace(
        "DefaultFormats.losslessDate()",
        "{ val __df = new java.text.SimpleDateFormat(\"yyyy-MM-dd'T'HH:mm:ss.SSS'Z'\"); " +
          "__df.setTimeZone(java.util.TimeZone.getTimeZone(\"UTC\")); __df }")
      c = c.replaceAll(
        "(?s)case\\s+MappingException\\(_,\\s*ex:\\s*InvocationTargetException\\)\\s*" +
          "if\\s+ex\\.getTargetException\\.isInstanceOf\\[IllegalArgumentException\\]\\s*=>\\s*" +
          "invalidBody\\((\"[^\"]*\"),\\s*(\"[^\"]*\"),\\s*ex\\.getTargetException\\)",
        "case me: MappingException " +
          "if me.getCause.isInstanceOf[InvocationTargetException] " +
          "&& me.getCause.asInstanceOf[InvocationTargetException].getTargetException.isInstanceOf[IllegalArgumentException] => " +
          "invalidBody($1, $2, me.getCause.asInstanceOf[InvocationTargetException].getTargetException)")
      if (c != orig) {
        IO.write(f, c)
        log.info("[json4s4-patch] rewrote json4s-3 constructs in " + f.getName)
      }
    }
  }
}

// generate managed sources (swagger codegen) -> patch -> compile
Compile / patchSwaggerForJson4s4 := (Compile / patchSwaggerForJson4s4)
  .dependsOn(Compile / managedSources).value
Compile / compile := (Compile / compile)
  .dependsOn(Compile / patchSwaggerForJson4s4).value

// The docker/publish chain runs scaladoc; don't scaladoc the generated sources (avoids
// recompiling the generated code outside the compile patch). On Spark 4.x, skip doc sources.
Compile / doc / sources := {
  val prev = (Compile / doc / sources).value
  if (sys.props.getOrElse("SPARK_VERSION", "4.2.0").startsWith("4.")) Seq.empty else prev
}
