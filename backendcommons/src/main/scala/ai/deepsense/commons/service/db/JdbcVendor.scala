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

package ai.deepsense.commons.service.db

import slick.jdbc.{H2Profile, JdbcProfile}

// Selects the backend DB by JDBC URL prefix: jdbc:mysql -> MySQL, anything else -> H2.
// A single URL (databaseSlick.db.url / JDBC_URL) therefore drives the Slick profile, the JDBC
// driver class, and the Flyway migration location, with no separate profile/driver config.
sealed abstract class JdbcVendor(val name: String, val profile: JdbcProfile, val driver: String)

object JdbcVendor {
  case object H2 extends JdbcVendor("h2", H2Profile, "org.h2.Driver")
  case object MySQL extends JdbcVendor("mysql", MySQLStringUuidProfile, "com.mysql.cj.jdbc.Driver")

  def fromUrl(url: String): JdbcVendor =
    if (Option(url).exists(_.startsWith("jdbc:mysql"))) MySQL else H2
}
