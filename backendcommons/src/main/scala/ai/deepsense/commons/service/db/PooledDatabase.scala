/**
 * Copyright 2026 6D Technologies
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

package ai.deepsense.commons.service.db

import com.typesafe.config.{Config, ConfigFactory, ConfigValueFactory}
import slick.jdbc.JdbcProfile

/**
 * Builds a connection-pooled Slick `Database` from a `db { ... }` config block.
 *
 * The services used to call `Database.forURL`, which builds a `DriverDataSource`: no pool at all,
 * a fresh physical connection opened and closed per action, and an `AsyncExecutor` whose
 * `maxConnections` defaults to `Integer.MAX_VALUE` — the unbounded case Slick warns "can result in
 * deadlocks", and which schedulingmanager had already had to work around by hand.
 *
 * `forConfig` is what makes `connectionPool` / `minConnections` / `maxConnections` take effect;
 * `forURL` ignores the config block entirely. Two details make a naive switch wrong:
 *
 *  - `forConfig` reads `driver` from the block, and every block here hardcodes the H2 driver, so a
 *    MySQL `JDBC_URL` would be handed `org.h2.Driver`. The driver is therefore overridden from
 *    [[JdbcVendor]], which derives it from the URL — the same thing that picks the Slick profile.
 *  - the block is re-nested under a fresh root rather than passed at the empty path, so the path
 *    Slick resolves is always a real one.
 */
object PooledDatabase {

  private val NestedPath = "db"

  def fromConfig(block: Config, vendor: JdbcVendor, poolName: String): JdbcProfile#API#Database = {
    val resolved = block
      .withValue("driver", ConfigValueFactory.fromAnyRef(vendor.driver))
      .withValue("poolName", ConfigValueFactory.fromAnyRef(poolName))
    val root = ConfigFactory.empty().withValue(NestedPath, resolved.root())
    vendor.profile.api.Database.forConfig(NestedPath, root)
  }
}
