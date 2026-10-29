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

package ai.deepsense.seahorse.scheduling.db

import slick.jdbc.JdbcProfile

import ai.deepsense.commons.service.db.{JdbcVendor, PooledDatabase}
import ai.deepsense.seahorse.scheduling.SchedulingManagerConfig

object Database {

  private val conf = SchedulingManagerConfig.config.getConfig("databaseSlick.db")
  private val vendor = JdbcVendor.fromUrl(conf.getString("url"))

  val driver: JdbcProfile = vendor.profile
  val api = driver.api
  // The hand-bounded AsyncExecutor that used to live here (maxConnections == maxThreads, to avoid
  // the deadlock Slick warns about when forURL leaves maxConnections unbounded — which this service
  // hit on MySQL alongside Quartz's concurrent DB use) is now expressed as numThreads /
  // maxConnections in databaseSlick.db, and applies to every service rather than just this one.
  val db = PooledDatabase.fromConfig(conf, vendor, "schedulingmanager")

  def forceInitialization(): Unit = {
    // Force initialization here to work around bug https://github.com/slick/slick/issues/1400
    val session = db.createSession()
    try session.force() finally session.close()
  }

}
