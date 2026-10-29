/**
 * Copyright 2026 6D Technologies
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

package ai.deepsense.commons.service.db

import com.typesafe.config.ConfigFactory
import org.scalatest.funspec.{AnyFunSpec => FunSpec}
import org.scalatest.matchers.should.Matchers
import slick.jdbc.hikaricp.HikariCPJdbcDataSource

class PooledDatabaseSpec extends FunSpec with Matchers {

  private def block(url: String, extra: String = "") = ConfigFactory.parseString(
    s"""
       |url = "$url"
       |driver = "org.h2.Driver"
       |user = ""
       |password = ""
       |connectionPool = "HikariCP"
       |numThreads = 20
       |maxConnections = 20
       |minConnections = 20
       |$extra
       |""".stripMargin)

  private def pool(db: Any) =
    db.asInstanceOf[slick.jdbc.JdbcBackend#DatabaseDef].source
      .asInstanceOf[HikariCPJdbcDataSource].ds

  describe("PooledDatabase") {
    it("builds a real HikariCP pool sized from the config") {
      val db = PooledDatabase.fromConfig(
        block("jdbc:h2:mem:pool-spec;DB_CLOSE_DELAY=-1"), JdbcVendor.H2, "spec-pool")
      try {
        pool(db).getMaximumPoolSize shouldBe 20
        pool(db).getMinimumIdle shouldBe 20
        pool(db).getPoolName shouldBe "spec-pool"
      } finally db.close()
    }

    it("honours a lowered min/max") {
      val db = PooledDatabase.fromConfig(
        block("jdbc:h2:mem:pool-spec-2;DB_CLOSE_DELAY=-1",
          "maxConnections = 5\nminConnections = 1\nnumThreads = 5"),
        JdbcVendor.H2, "small-pool")
      try {
        pool(db).getMaximumPoolSize shouldBe 5
        pool(db).getMinimumIdle shouldBe 1
      } finally db.close()
    }

    it("takes the driver from the URL's vendor, not the config block") {
      // the block says org.h2.Driver; a MySQL URL must not be handed it
      val db = PooledDatabase.fromConfig(
        block("jdbc:mysql://nowhere:3306/x"), JdbcVendor.MySQL, "mysql-pool")
      try {
        pool(db).getDriverClassName shouldBe "com.mysql.cj.jdbc.Driver"
      } finally db.close()
    }
  }
}
