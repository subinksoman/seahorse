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
// scalastyle:off

lazy val settingsForPublished = CommonSettingsPlugin.assemblySettings ++
  LicenceReportSettings.settings ++ PublishSettings.enablePublishing
lazy val settingsForNotPublished = CommonSettingsPlugin.assemblySettings ++
  LicenceReportSettings.settings ++ PublishSettings.disablePublishing

lazy val sparkVersion = Version.spark
//println(s"SPARK_VERSION $sparkVersion")


lazy val sparkUtils = sparkVersion match {
  case "2.0.0" | "2.0.1" | "2.0.2" =>
    val sparkUtils2_0_x = project in file("sparkutils2.0.x") settings settingsForPublished
    sparkUtils2_0_x
  case "2.1.0" | "2.1.1" =>
    val sparkUtils2_1_0 = project in file("sparkutils2.1.x") settings settingsForPublished
    sparkUtils2_1_0
  case "2.2.0"  =>
    val sparkUtils2_1_0 = project in file("sparkutils2.2.x") settings settingsForPublished
    sparkUtils2_1_0
  case "2.4.8" =>
    val sparkUtils2_4_8 = project in file("sparkutils2.4.x") settings settingsForPublished
    sparkUtils2_4_8
  case "3.0.0" =>
    val sparkUtils3_0_0 = project in file("sparkutils3.0.x") settings settingsForPublished
    sparkUtils3_0_0
  case "3.4.4" =>
    // Step A: reuse the 3.0.x shim (public-API CSV; SparkR backend stable across 3.0->3.4).
    // Fork sparkutils3.4.x only if a 3.4.4 compile reveals version-specific breakage.
    val sparkUtils3_4_4 = project in file("sparkutils3.0.x") settings settingsForPublished
    sparkUtils3_4_4
  case v if v.startsWith("4.") =>
    // T40: forked shim for the whole Spark 4.x line (verified against 4.0.0 and 4.2.0).
    val sparkUtils4_0_x = project in file("sparkutils4.0.x") settings settingsForPublished
    sparkUtils4_0_x
}

//lazy val sparkUtils2_x = project in file(s"sparkutils2.x") dependsOn (csvlib, sparkUtils) settings settingsForPublished

lazy val sparkUtils2_x = project in file(s"sparkutils_test") dependsOn (csvlib, sparkUtils) settings settingsForPublished


lazy val csv3_0 = project in file(s"sparkutilsfeatures/csv3_0") settings settingsForPublished
lazy val csv4_0 = project in file(s"sparkutilsfeatures/csv4_0") settings settingsForPublished
lazy val csv2_4 = project in file(s"sparkutilsfeatures/csv2_4") settings settingsForPublished
lazy val csv2_2 = project in file(s"sparkutilsfeatures/csv2_2") settings settingsForPublished
lazy val csv2_0 = project in file(s"sparkutilsfeatures/csv2_0") dependsOn sparkUtils settings settingsForPublished

lazy val csvlib = sparkVersion match {
  case "2.0.0" | "2.0.1" | "2.0.2" =>
    csv2_0
  case "2.1.0" | "2.1.1"  =>
    csv2_0
  case "2.2.0"  =>
    csv2_2
  case "2.4.8" =>
    csv2_4
  case "3.0.0" =>
    csv3_0
  case "3.4.4" =>
    csv3_0
  case v if v.startsWith("4.") =>
    csv4_0
}

lazy val readjsondataset = project in file(s"sparkutilsfeatures/readjsondataset") dependsOn sparkUtils2_x settings settingsForPublished
lazy val readjsondataframe = project in file(s"sparkutilsfeatures/readjsondataframe") dependsOn sparkUtils2_x settings settingsForPublished

lazy val readjson = sparkVersion match {
  case "2.0.0" | "2.0.1" | "2.0.2" => readjsondataframe
  case "2.1.0" | "2.1.1"  => readjsondataframe
  case "2.2.0" => readjsondataset
  case "2.4.8" => readjsondataset
  case "3.0.0" => readjsondataset
  case "3.4.4" => readjsondataset
  case v if v.startsWith("4.") => readjsondataset
}

lazy val rootProject = project
  .in(file("."))
  .settings(name := "seahorse")
  .settings(PublishSettings.disablePublishing)
  .aggregate(
    api,
    csvlib,
    readjson,
    sparkUtils2_x,
    sparkUtils,
    commons,
    deeplang,
    docgen,
    graph,
    workflowjson,
    reportlib,
    workflowexecutormqprotocol,
    workflowexecutor)

lazy val api = project settings settingsForPublished

lazy val commons = project dependsOn (api, sparkUtils2_x) settings settingsForPublished

lazy val deeplang = project dependsOn (commons, readjson, csvlib,
commons % "test->test",
graph,
graph % "test->test",
reportlib,
reportlib % "test->test") settings settingsForPublished
lazy val docgen = project dependsOn (deeplang) settings settingsForNotPublished
lazy val graph = project dependsOn (commons,
commons % "test->test") settings settingsForPublished
lazy val workflowjson = project dependsOn (commons, deeplang, graph) settings settingsForNotPublished
lazy val reportlib = project dependsOn commons settings settingsForPublished
lazy val workflowexecutormqprotocol = project dependsOn (commons,
commons % "test->test",
deeplang,
reportlib % "test->test",
workflowjson) settings settingsForNotPublished

lazy val sdk = project dependsOn (
  deeplang
) settings settingsForPublished

lazy val workflowexecutor = project dependsOn (commons % "test->test",
deeplang,
deeplang % "test->test",
deeplang % "test->it",
workflowjson,
workflowjson % "test -> test",
sdk,
workflowexecutormqprotocol,
workflowexecutormqprotocol % "test -> test") settings settingsForNotPublished settings (
    fork := true,
    // Full Spark 3.4 JDK-17 module-opens set (JDK 17 needs more than the JDK 11 subset).
    javaOptions ++= CommonSettingsPlugin.jdk17ModuleOpts
  )

// Sequentially perform integration tests
addCommandAlias(
  "ds-it",
  ";commons/it:test " +
    ";deeplang/it:test " +
    ";graph/it:test " +
    ";workflowjson/it:test " +
    ";reportlib/it:test " +
    ";workflowexecutor/it:test" +
    ";workflowexecutormqprotocol/it:test"
)

addCommandAlias(
  "generateExamples",
  "deeplang/it:testOnly ai.deepsense.deeplang.doperations.examples.*")

//dependencyOverrides += "org.scala-lang.modules" %% "scala-xml" % "2.3.0"
//ThisBuild / libraryDependencySchemes += "org.scala-lang.modules" %% "scala-xml" % VersionScheme.Always
//libraryDependencySchemes += "org.scala-lang.modules" %% "scala-xml" % "early-semver"
//libraryDependencies += "org.scalariform" %% "scalariform" % "0.2.10

//ThisBuild / versionScheme := Some("early-semver")

evictionErrorLevel := Level.Warn
// Step A (Scala 2.12.10 -> 2.12.17): scala-compiler 2.12.17 pulls scala-xml 2.1.0 while
// scalate 1.9.0 wants 1.1.0. Declare scala-xml versions compatible build-wide so all
// sub-modules (commons, deeplang, ...) resolve, not just the root project.
ThisBuild / libraryDependencySchemes += "org.scala-lang.modules" %% "scala-xml" % VersionScheme.Always
// Same story for scala-parser-combinators: Spark 3.4.4 (catalyst/mllib) pulls 2.1.1 while
// scalate 1.9.0 wants 1.1.1. Declare compatible build-wide (surfaced in the docgen module).
ThisBuild / libraryDependencySchemes += "org.scala-lang.modules" %% "scala-parser-combinators" % VersionScheme.Always
// During the Akka->Pekko transition both stacks briefly coexist on the classpath (Akka
// still comes transitively via the sparkutils shim). Pekko wants scala-java8-compat 1.0.2,
// Akka 2.4 wants 0.8.0 -- declare compatible so resolution picks 1.0.2.
ThisBuild / libraryDependencySchemes += "org.scala-lang.modules" %% "scala-java8-compat" % VersionScheme.Always
libraryDependencies += "org.scala-lang.modules" %% "scala-xml" % "2.3.0"

libraryDependencies ++= Seq(
  "org.scoverage" %% "scalac-scoverage-reporter" % "2.3.0" exclude("org.scala-lang.modules", "scala-xml_2.12"),
  "org.scalariform" %% "scalariform" % "0.2.10",
  "org.scala-lang.modules" %% "scala-xml" % "2.3.0" // or 1.0.6
)

libraryDependencies ++= Dependencies.api ++ Seq(
  "io.swagger" % "swagger-codegen" % "2.4.21",
  "io.swagger" % "swagger-parser"  % "1.0.56"
)


// scalastyle:on

// Scala 2.13 / scalatest 3.2 test-support: MockitoSugar moved to org.scalatestplus.mockito
// (mockito-1-10 keeps the project's Mockito 1.10.19) and GeneratorDrivenPropertyChecks moved to
// org.scalatestplus.scalacheck. Added build-wide in Test scope so every module's specs resolve them.
ThisBuild / libraryDependencies ++= Seq(
  "org.scalatestplus" %% "mockito-1-10" % "3.1.0.0" % Test,
  "org.scalatestplus" %% "scalacheck-1-15" % "3.2.3.0" % Test
)

// Keep Mockito at 1.10.19 (a transitive dep otherwise evicts it up to 3.x/5.x on 2.13, which
// removed org.mockito.Matchers -> the specs' `any(...)` matchers stop resolving).
ThisBuild / dependencyOverrides += "org.mockito" % "mockito-core" % "1.10.19"

// T92 security: pin the on-classpath jackson to the patched 2.18.8 and drop the scala-compiler
// jline (unused REPL/telnet). Note the residual jackson 2.18.6 / 2.19.2 and jline-remote-telnet
// Trivy still reports are RELOCATED copies shaded inside hadoop-client-runtime / parquet-jackson
// (Spark 4.2.0's stack) — not on the app classpath and only fixable by an upstream Spark bump.
ThisBuild / dependencyOverrides ++= Seq(
  "com.fasterxml.jackson.core" % "jackson-databind" % "2.18.8",
  "com.fasterxml.jackson.core" % "jackson-core" % "2.18.8",
  "com.fasterxml.jackson.core" % "jackson-annotations" % "2.18.8",
  // jackson-module-scala must track databind's minor (it enforces >=2.18.0 <2.19.0); leaving it at
  // 2.15.2 makes Spark's Scala serialization throw at workflow-run time against databind 2.18.8.
  "com.fasterxml.jackson.module" %% "jackson-module-scala" % "2.18.8",
  // T92 security: patched versions of the vulnerable libs the workflowexecutor assembly (we.jar)
  // otherwise bundles (Trivy CRITICAL/HIGH). These are transitive/generated-client deps, not used
  // via hand-written APIs, so the bumps are drop-in.
  "com.squareup.okhttp3" % "okhttp" % "4.12.0",
  "org.yaml" % "snakeyaml" % "2.3",
  "com.google.code.gson" % "gson" % "2.10.1",
  "commons-io" % "commons-io" % "2.16.1",
  "org.json" % "json" % "20240303"
)
ThisBuild / excludeDependencies ++= Seq(
  ExclusionRule("org.jline", "jline"),
  ExclusionRule("org.jline", "jline-remote-telnet"),
  // slf4j-ext (extended logging: EventData/MDCStrLookup) is an unused transitive carrying
  // CVE-2018-8088; nothing on the classpath references it.
  ExclusionRule("org.slf4j", "slf4j-ext")
)
