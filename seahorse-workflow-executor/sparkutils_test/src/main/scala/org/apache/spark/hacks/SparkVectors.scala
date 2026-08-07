/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

// Lives in the org.apache.spark package tree so it can reference org.apache.spark.ml.linalg.VectorUDT,
// which is private[spark]. Spark 4.x ML estimators/classifiers emit vector columns
// (rawPrediction/probability/features) with THIS UDT; matching against mllib.linalg.VectorUDT (a
// different class) fails, so column-type inference reports them as 'other' instead of 'vector'.
package org.apache.spark.hacks

object SparkVectors {
  type VectorUDT = org.apache.spark.ml.linalg.VectorUDT
}
