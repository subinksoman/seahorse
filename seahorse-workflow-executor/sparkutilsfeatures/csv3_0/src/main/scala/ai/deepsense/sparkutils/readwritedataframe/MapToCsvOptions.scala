/*
 * Copyright 2018 deepsense.ai (CodiLime, Inc)
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

package ai.deepsense.sparkutils.readwritedataframe

import org.apache.spark.sql.{DataFrameReader, SparkSession}

object MapToCsvOptions {

  /**
   * Applies CSV options to a Spark DataFrameReader instance using the provided options map.
   * This is a Spark 3 compatible version, replacing the removed internal CSVOptions class.
   *
   * @param spark SparkSession
   * @param options Map of CSV options
   * @return Configured DataFrameReader
   */
  def apply(spark: SparkSession, options: Map[String, String]): DataFrameReader = {
    options.foldLeft(spark.read.format("csv")) {
      case (reader, (key, value)) => reader.option(key, value)
    }
  }
}

