/**
 * Copyright 2016 deepsense.ai (CodiLime, Inc)
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

package org.apache.spark.sql.execution.datasources.csv

import org.apache.spark.rdd.RDD
import org.apache.spark.sql.{DataFrame, SparkSession}
import org.apache.spark.sql.types.{StructType, StructField, StringType}

/**
  * Heavily based on org.apache.spark.sql.execution.datasources.csv.CSVFileFormat
  */
object RawCsvRDDToDataframe {

  def parse(
      rdd: RDD[String],
      sparkSession: SparkSession,
      options: Map[String, String]
  ): DataFrame = {
    val sqlConf = sparkSession.sessionState.conf

    // Import implicits for toDS
    import sparkSession.implicits._

    // Configure default options
    val csvOptions = options ++ Map(
      "timeZone" -> sqlConf.sessionLocalTimeZone,
      "columnNameOfCorruptRecord" -> sqlConf.columnNameOfCorruptRecord
    )

    // Determine the schema
    val headerFlag = csvOptions.getOrElse("header", "false").toBoolean
    val firstLine = findFirstLine(csvOptions, rdd)
    val header = if (headerFlag) {
      // Parse the first line to extract headers
      val parser = new com.univocity.parsers.csv.CsvParser(
        createParserSettings(csvOptions)
      )
      val firstRow = parser.parseLine(firstLine)
      firstRow.zipWithIndex.map { case (value, index) =>
        if (value == null || value.isEmpty || value == csvOptions.getOrElse("nullValue", "")) s"_c$index" else value
      }
    } else {
      // Generate default column names
      val firstRow = new com.univocity.parsers.csv.CsvParser(
        createParserSettings(csvOptions)
      ).parseLine(firstLine)
      firstRow.zipWithIndex.map { case (_, index) => s"_c$index" }
    }

    // Create schema with all StringType fields
    val schema = StructType(header.map { fieldName =>
      StructField(fieldName.toString, StringType, nullable = true)
    })

    // Filter out header if present
    val withoutHeader = if (headerFlag) {
      rdd.zipWithIndex()
        .filter { case (_, index) => index != 0 }
        .map { case (row, _) => row }
    } else {
      rdd
    }

    // Create DataFrame using Spark's CSV reader
    sparkSession.read
      .format("csv")
      .schema(schema)
      .options(csvOptions)
      .csv(withoutHeader.toDS())
  }

  private def findFirstLine(options: Map[String, String], rdd: RDD[String]): String = {
    val comment = options.get("comment")
    rdd.filter { line =>
      line.trim.nonEmpty && comment.forall(c => !line.startsWith(c.toString))
    }.first()
  }

  private def createParserSettings(options: Map[String, String]): com.univocity.parsers.csv.CsvParserSettings = {
    val settings = new com.univocity.parsers.csv.CsvParserSettings()
    options.get("delimiter").foreach(d => settings.getFormat.setDelimiter(d))
    options.get("quote").foreach(q => settings.getFormat.setQuote(q.charAt(0)))
    options.get("escape").foreach(e => settings.getFormat.setQuoteEscape(e.charAt(0)))
    options.get("comment").foreach(c => settings.getFormat.setComment(c.charAt(0)))
    settings.setHeaderExtractionEnabled(options.getOrElse("header", "false").toBoolean)
    settings.setSkipEmptyLines(true)
    settings
  }
}
