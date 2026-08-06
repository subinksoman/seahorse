/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

package ai.deepsense.commons.service.db

import java.sql.{PreparedStatement, ResultSet}
import java.util.UUID

import slick.ast.FieldSymbol
import slick.jdbc.MySQLProfile

// Slick's default UUID mapping on MySQL stores the UUID as a 16-byte BINARY(16) blob, which renders
// as unreadable bytes in any SQL client (id/workflow_id/node_id columns) and prevents the example-seed
// migrations from using plain UUID string literals. This profile overrides the UUID column type to a
// human-readable CHAR(36) string ('xxxxxxxx-xxxx-...'), so UUID columns are readable AND seed SQL can
// insert literal UUID strings. Only the MySQL backend uses this; H2 keeps its native (readable) UUID.
trait MySQLStringUuidProfile extends MySQLProfile {
  override val columnTypes = new JdbcTypes

  class JdbcTypes extends super.JdbcTypes {
    override val uuidJdbcType = new UUIDJdbcType {
      override def sqlType: Int = java.sql.Types.CHAR
      override def sqlTypeName(sym: Option[FieldSymbol]): String = "CHAR(36)"
      override def setValue(v: UUID, p: PreparedStatement, idx: Int): Unit = p.setString(idx, v.toString)
      override def setNull(p: PreparedStatement, idx: Int): Unit = p.setNull(idx, java.sql.Types.CHAR)
      override def getValue(r: ResultSet, idx: Int): UUID = {
        val s = r.getString(idx)
        if (s == null) null else UUID.fromString(s)
      }
      override def updateValue(v: UUID, r: ResultSet, idx: Int): Unit = r.updateString(idx, v.toString)
      override def hasLiteralForm: Boolean = true
      override def valueToSQLLiteral(value: UUID): String = s"'${value.toString}'"
    }
  }
}

object MySQLStringUuidProfile extends MySQLStringUuidProfile
