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

import sbt.Tests.{Group, SubProcess}
import CommonSettingsPlugin._

// scalastyle:off

name := "seahorse-executor-deeplang"

// Integration tests using Spark Clusters need jar
test in Test := (test in Test).dependsOn(assembly).value

// JVM options for the forked test JVMs. Spark 3.4.4 needs these --add-opens on
// JDK 11+ (it accesses java.base internals reflectively); the empty vector that
// worked on Java 8 fails on JDK 11 with InaccessibleObjectException.
// Full Spark 3.4 JDK-17 module-opens set (JDK 17 needs more than the JDK 11 subset).
val sparkTestJvmOptions = CommonSettingsPlugin.jdk17ModuleOpts.toVector

// Only one spark context per JVM
def assignTestsToJVMs(testDefs: Seq[TestDefinition]) = {
  val (forJvm1, forJvm2) = testDefs.partition(_.name.contains("ClusterDependentSpecsSuite"))

  Seq(
    Group(
      name = "tests_for_jvm_1",
      tests = forJvm1,
      runPolicy = SubProcess(
        sbt.ForkOptions()
          .withRunJVMOptions(sparkTestJvmOptions)
      )
    ),
    Group(
      name = "test_for_jvm_2",
      tests = forJvm2,
      runPolicy = SubProcess(
        sbt.ForkOptions()
          .withRunJVMOptions(sparkTestJvmOptions)
      )
    )
  )
}

testGrouping in Test := {
  val testDefinitions = (definedTests in Test).value
  assignTestsToJVMs(testDefinitions)
}

// -Xfatal-warnings is set at project scope by CommonSettingsPlugin (scalacOptions :=),
// so it must be removed at PROJECT scope here to take effect; ThisBuild scope does not
// override the plugin's setting. Step A: Spark 3.4.4 deprecates ChiSqSelector (still
// functional in 3.4.4) -- don't fail the build on expected migration deprecations.
// TODO(Step A follow-up): migrate ChiSqSelector -> UnivariateFeatureSelector (semantic change).
scalacOptions --= Seq("-Xfatal-warnings")

Compile / doc / sources := Seq()

libraryDependencies ++= Dependencies.deeplang

// scalastyle:on
