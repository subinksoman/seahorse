package org.apache.spark.sql.execution.datasources.csv

import java.io.{BufferedWriter, FileWriter}
import org.apache.spark.sql.types._
import org.apache.spark.sql.{DataFrame, SparkSession}

object DataframeToDriverCsvFileWriter {

  def write(
    dataFrame: DataFrame,
    options: Map[String, String],
    dataSchema: StructType,
    pathWithoutScheme: String,
    sparkSession: SparkSession
  ): Unit = {

    val delimiter = options.getOrElse("delimiter", ",")
    val quoteChar = options.getOrElse("quote", "\"")

    val data = dataFrame.collect() // Collects all data to the driver

    val writer = new BufferedWriter(new FileWriter(pathWithoutScheme))

    try {
      // Write header
      val header = dataSchema.fieldNames.map(escape(_, quoteChar)).mkString(delimiter)
      writer.write(header)
      writer.newLine()

      // Write data rows
      data.foreach { row =>
        val rowString = row.toSeq.map {
          case null => ""
          case v    => escape(v.toString, quoteChar)
        }.mkString(delimiter)
        writer.write(rowString)
        writer.newLine()
      }
    } finally {
      writer.close()
    }
  }

  private def escape(value: String, quote: String): String = {
    if (value.contains(",") || value.contains("\n") || value.contains(quote)) {
      s"$quote${value.replace(quote, quote + quote)}$quote"
    } else {
      value
    }
  }
}

