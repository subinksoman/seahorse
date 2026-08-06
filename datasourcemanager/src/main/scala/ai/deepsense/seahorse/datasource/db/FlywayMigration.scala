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

package ai.deepsense.seahorse.datasource.db

import org.flywaydb.core.Flyway

import ai.deepsense.commons.service.db.JdbcVendor
import ai.deepsense.seahorse.datasource.DatasourceManagerConfig

object FlywayMigration {

  private val db = DatasourceManagerConfig.database
  private val conf = DatasourceManagerConfig.config

  def run(): Unit = {
    val url = conf.getString("databaseSlick.db.url")
    val vendor = JdbcVendor.fromUrl(url)
    val user = if (conf.hasPath("databaseSlick.db.user")) conf.getString("databaseSlick.db.user") else ""
    val pass = if (conf.hasPath("databaseSlick.db.password")) conf.getString("databaseSlick.db.password") else ""
    Flyway.configure()
      .dataSource(url, user, pass)
      .schemas(db.schema)
      .locations(s"classpath:db/migration/${vendor.name}/datasourcemanager")
      .baselineOnMigrate(true)
      .load()
      .migrate()
  }
}
