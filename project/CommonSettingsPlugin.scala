/**
 * Copyright 2015 deepsense.ai (CodiLime, Inc)
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

import com.typesafe.sbt.packager.universal.UniversalPlugin.autoImport.Universal
import sbt.Keys._
import sbt._
import sbt.plugins.JvmPlugin

object CommonSettingsPlugin extends AutoPlugin {
  override def requires = JvmPlugin
  override def trigger = allRequirements

  lazy val OurIT = config("it") extend Test

  lazy val globalResources = file("globalresources").getAbsoluteFile

  override def globalSettings = Seq(
    //scalaVersion := "2.11.8"
    scalaVersion := "2.13.12"
  )

  override def projectSettings = Seq(
    organization := "ai.deepsense",
    scalacOptions := Seq(
      "-unchecked", "-deprecation", "-encoding", "utf8", "-feature",
      "-language:existentials", "-language:implicitConversions"
    ),
    javacOptions ++= Seq(
      // Java 8 bytecode; `-source/-target 7` is obsolete on JDK 17 and removed in JDK 20+.
      "-source", "1.8",
      "-target", "1.8"
    ),
    //resolvers ++= Dependencies.resolvers,
    resolvers ++= Seq(
  "sonatype.org" at "https://oss.sonatype.org/content/repositories/releases",
  Resolver.typesafeRepo("releases"),
  "Maven Central" at "https://repo1.maven.org/maven2/"
),

    crossPaths := false,
    unmanagedResourceDirectories in Compile += globalResources,
    unmanagedResourceDirectories in Runtime += globalResources,
    unmanagedResourceDirectories in Test += globalResources
  ) ++ ouritSettings ++ testSettings ++ Seq(
    test := (test in Test).value
  )

  lazy val ouritSettings = inConfig(OurIT)(Defaults.testSettings) ++ inConfig(OurIT) {
    Seq(
      testOptions ++= Seq(
        // Show full stacktraces (F), Put results in target/test-reports
        Tests.Argument(TestFrameworks.ScalaTest, "-oF", "-u", "target/test-reports")
      ),
      javaOptions := Seq(s"-DlogFile=${name.value}") ++ jdk17ModuleOpts,
      fork := true,
      unmanagedClasspath += baseDirectory.value / "conf"
    )
  }

  // JDK 17: Spark reflects into JDK internals, which the module system blocks by default
  // (InaccessibleObjectException). Mirror Spark 3.4's JavaModuleOptions so forked test JVMs
  // can run Spark on JDK 17 (harmless on JDK 8/11).
  lazy val jdk17ModuleOpts = Seq(
    "--add-opens=java.base/java.lang=ALL-UNNAMED",
    "--add-opens=java.base/java.lang.invoke=ALL-UNNAMED",
    "--add-opens=java.base/java.lang.reflect=ALL-UNNAMED",
    "--add-opens=java.base/java.io=ALL-UNNAMED",
    "--add-opens=java.base/java.net=ALL-UNNAMED",
    "--add-opens=java.base/java.nio=ALL-UNNAMED",
    "--add-opens=java.base/java.util=ALL-UNNAMED",
    "--add-opens=java.base/java.util.concurrent=ALL-UNNAMED",
    "--add-opens=java.base/java.util.concurrent.atomic=ALL-UNNAMED",
    "--add-opens=java.base/sun.nio.ch=ALL-UNNAMED",
    "--add-opens=java.base/sun.nio.cs=ALL-UNNAMED",
    "--add-opens=java.base/sun.security.ssl=ALL-UNNAMED",
    "--add-opens=java.base/sun.security.action=ALL-UNNAMED",
    "--add-opens=java.base/sun.util.calendar=ALL-UNNAMED",
    "--add-opens=java.security.jgss/sun.security.krb5=ALL-UNNAMED",
    "-Dio.netty.tryReflectionSetAccessible=true"
  )

  lazy val testSettings = inConfig(Test) {
    Seq(
      testOptions := Seq(
        // Put results in target/test-reports
        Tests.Argument(
          TestFrameworks.ScalaTest,
          "-o",
          "-u", "target/test-reports"
        )
      ),
      fork := true,
      javaOptions := Seq(s"-DlogFile=${name.value}") ++ jdk17ModuleOpts,
      unmanagedClasspath += baseDirectory.value / "conf"
    )
  }

  override def projectConfigurations = OurIT +: super.projectConfigurations
}
