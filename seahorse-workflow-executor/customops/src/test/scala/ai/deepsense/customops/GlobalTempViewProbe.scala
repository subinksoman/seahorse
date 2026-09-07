package ai.deepsense.customops

import org.apache.spark.sql.SparkSession

/**
 * Settles the assumption the multi-port operations rest on: extra ports travel as global temp
 * views, and the operation drops each view once it has been read. That is only correct if the
 * DataFrame handed back keeps working after the view is gone — i.e. if analysis inlines the view's
 * stored plan rather than re-resolving it from the catalog at execution time. Also checks that a
 * view registered in one session is visible from a `newSession()`, which is how the Python side
 * sees it.
 */
object GlobalTempViewProbe {
  def main(args: Array[String]): Unit = {
    val spark = SparkSession.builder().master("local[2]").appName("probe").getOrCreate()
    import spark.implicits._
    try {
      Seq((1, "a"), (2, "b")).toDF("id", "name").createOrReplaceGlobalTempView("probe_v")

      // 1. visible from a derived session (the Python side runs in newSession())
      val other = spark.newSession()
      println(s"newSession() sees the view: rows=${other.table("global_temp.probe_v").count()}")

      // 2. read it back, then drop it, THEN materialise - the case the operations depend on
      val df = spark.table("global_temp.probe_v").filter($"id" > 0).select($"name")
      spark.catalog.dropGlobalTempView("probe_v")
      println(s"catalog still has probe_v: ${spark.catalog.tableExists("global_temp.probe_v")}")
      println(s"collect AFTER drop: ${df.collect().map(_.getString(0)).mkString(",")}")
      println(s"count  AFTER drop: ${df.count()}")

      // 3. and a fresh lookup must now fail, proving the drop really took effect
      val failed = try { spark.table("global_temp.probe_v").count(); false } catch { case _: Throwable => true }
      println(s"fresh lookup after drop fails as expected: $failed")
    } finally spark.stop()
  }
}
