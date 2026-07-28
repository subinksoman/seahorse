package ai.deepsense.sparkutils.spi

import java.util.ServiceLoader
import org.apache.spark.sql.SparkSession
//import scala.jdk.CollectionConverters._
import scala.collection.JavaConverters._

/**
  * SPI Interface for services wishing to tweak the SparkSession after its created
  * (e.g. for registering UDFs).
  *
  * @since 5/22/18
  */
trait SparkSessionInitializer {
  def init(sparkSession: SparkSession): Unit
}

object SparkSessionInitializer {
  def apply(sparkSession: SparkSession): SparkSession = {

    /*val initializers = ServiceLoader.load(classOf[SparkSessionInitializer])
    for (initter <- initializers.asScala) {
      initter.init(sparkSession)
    }*/
val initializers = ServiceLoader.load(classOf[SparkSessionInitializer])
for (initter <- initializers.asScala) {
  initter.init(sparkSession)
}
    sparkSession
  }
}

