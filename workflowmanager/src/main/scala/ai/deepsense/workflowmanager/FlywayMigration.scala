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

package ai.deepsense.workflowmanager

import com.typesafe.config.ConfigFactory
import org.flywaydb.core.Flyway

import ai.deepsense.commons.service.db.JdbcVendor

object FlywayMigration {

  private val config = ConfigFactory.load

  def run(): Unit = {
    val url = config.getString("db.url")
    val vendor = JdbcVendor.fromUrl(url)
    val user = if (config.hasPath("db.user")) config.getString("db.user") else ""
    val pass = if (config.hasPath("db.password")) config.getString("db.password") else ""
    Flyway.configure()
      .dataSource(url, user, pass)
      .locations(s"classpath:db/migration/${vendor.name}/workflowmanager")
      .baselineOnMigrate(true)
      .load()
      .migrate()
  }
}
