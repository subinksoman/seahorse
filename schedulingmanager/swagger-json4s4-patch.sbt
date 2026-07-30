// T42 (Spark 4.x): the external scalatra-swagger-codegen 1.7 plugin emits json4s-3 idioms into
// the generated DefaultApi.scala that don't compile against json4s 4.0 (which Spark 4.x bundles):
//   * DefaultFormats.losslessDate()  -> removed/inaccessible in 4.0
//   * case MappingException(_, ex)   -> MappingException is no longer a case class (no unapply)
// Rewrite those to json4s-4 equivalents after codegen, before compile. Guarded to Spark 4.x so the
// 3.4.4 build (json4s 3.7, where the original code is correct) is untouched. Idempotent: the target
// substrings are gone after the first pass, so re-running is a no-op.

val patchSwaggerForJson4s4 = taskKey[Unit](
  "Rewrite generated json4s-3 constructs to json4s-4 in DefaultApi.scala (Spark 4.x only)")

Compile / patchSwaggerForJson4s4 := {
  val log = streams.value.log
  val is4x = sys.props.getOrElse("SPARK_VERSION", "3.0.0").startsWith("4.")
  if (is4x) {
    val f = (Compile / sourceManaged).value /
      "swagger-generated" / "ai" / "deepsense" / "seahorse" / "scheduling" / "api" / "DefaultApi.scala"
    if (f.exists) {
      val orig = IO.read(f)
      var c = orig
      // 1) lossless date formatter
      c = c.replace(
        "DefaultFormats.losslessDate()",
        "{ val __df = new java.text.SimpleDateFormat(\"yyyy-MM-dd'T'HH:mm:ss.SSS'Z'\"); " +
          "__df.setTimeZone(java.util.TimeZone.getTimeZone(\"UTC\")); __df }")
      // 2) MappingException extraction (json4s 4.0 has no case-class unapply; use getCause)
      c = c.replaceAll(
        "(?s)case\\s+MappingException\\(_,\\s*ex:\\s*InvocationTargetException\\)\\s*" +
          "if\\s+ex\\.getTargetException\\.isInstanceOf\\[IllegalArgumentException\\]\\s*=>\\s*" +
          "invalidBody\\(\"workflowSchedule\",\\s*\"WorkflowSchedule\",\\s*ex\\.getTargetException\\)",
        "case me: MappingException " +
          "if me.getCause.isInstanceOf[InvocationTargetException] " +
          "&& me.getCause.asInstanceOf[InvocationTargetException].getTargetException.isInstanceOf[IllegalArgumentException] => " +
          "invalidBody(\"workflowSchedule\", \"WorkflowSchedule\", " +
          "me.getCause.asInstanceOf[InvocationTargetException].getTargetException)")
      if (c != orig) {
        IO.write(f, c)
        log.info("[json4s4-patch] rewrote json4s-3 constructs in " + f.getName)
      } else {
        log.info("[json4s4-patch] nothing to patch in " + f.getName + " (already json4s-4 or unexpected shape)")
      }
    }
  }
}

// Sequence: generate managed sources (runs the swagger codegen) -> patch -> compile.
Compile / patchSwaggerForJson4s4 := (Compile / patchSwaggerForJson4s4)
  .dependsOn(Compile / managedSources).value
Compile / compile := (Compile / compile)
  .dependsOn(Compile / patchSwaggerForJson4s4).value
