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

import ai.deepsense.commons.service.db.JdbcVendor
import ai.deepsense.seahorse.scheduling.SchedulingManagerConfig

object Database {

  private val conf = SchedulingManagerConfig.config.getConfig("databaseSlick.db")
  private val url = conf.getString("url")
  private val vendor = JdbcVendor.fromUrl(url)
  private val user = if (conf.hasPath("user")) conf.getString("user") else ""
  private val pass = if (conf.hasPath("password")) conf.getString("password") else ""

  val driver: JdbcProfile = vendor.profile
  val api = driver.api
  val db = driver.api.Database.forURL(url, user = user, password = pass, driver = vendor.driver)

  def forceInitialization(): Unit = {
    // Force initialization here to work around bug https://github.com/slick/slick/issues/1400
    val session = db.createSession()
    try session.force() finally session.close()
  }

}
