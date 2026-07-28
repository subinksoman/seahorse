# Step A — Spark 3.0.0 → 3.4.4 on Scala 2.12 / JDK 11

Isolates the Spark-API migration from the Scala 2.13 / Pekko / JDK 17 jump (Step B). Verified on JDK 11.0.27, `SPARK_VERSION=3.4.4`.

## Milestone: `deeplang` compiles green against Spark 3.4.4

`sbt -DSPARK_VERSION=3.4.4 deeplang/compile` → **`[success]`, 0 errors, 522 Scala + 1 Java sources**. deeplang carries all the MLlib operation wrappers, so this validates the bulk of the Spark-API surface from [T00](T00-spark-api-inventory.md) against 3.4.4.

## Changes (all in the workflow-executor build)

| File | Change | Why |
|---|---|---|
| `project/Dependencies.scala` | Add `case "3.4.4" => ("2.12.17", "1.8", "3.3.4", "2.4.12", "3.17.0")` to the `Version` match | Spark 3.4.4 is built with Scala 2.12.17 / Hadoop 3.3.4 |
| `project/Dependencies.scala` | `slf4j` bumped 1.7.36 → **2.0.7**; added `slf4j` to `sparkutils(...)` deps | Spark 3.4.4 uses the slf4j 2.x line; a 1.7-vs-2.0 conflict was resolving the `slf4j-api` jar away, so the shims (which mix in Spark's `Logging`) lost `org.slf4j.Logger` |
| `build.sbt` | `case "3.4.4"` arms for `sparkUtils` / `csvlib` / `readjson` (reuse 3.0.x shims) | csv3_0 shims are already public-API; SparkR backend stable 3.0→3.4 — no fork needed yet |
| `build.sbt` | Enable `ThisBuild / libraryDependencySchemes += scala-xml % VersionScheme.Always` | scala-compiler 2.12.17 pulls scala-xml 2.1.0 vs scalate's 1.1.0 — eviction error across sub-modules |
| `deeplang/build.sbt` | Remove `-Xfatal-warnings` at **project** scope (was ineffective at ThisBuild scope) | Spark 3.4.4 deprecates `ChiSqSelector`; deprecation-as-error blocked the build |

## Follow-ups (not blocking Step A compile)
- **Migrate `ChiSqSelector` → `UnivariateFeatureSelector`** (semantic API change; do with tests). Files: `deeplang/.../estimators/ChiSqSelectorEstimator.scala`, `deeplang/.../models/ChiSqSelectorModel.scala`.
- **slf4j 2.x logging backend:** main deps still use `log4j-slf4j-impl` (slf4j 1.7 binding); Spark 3.4.4 pulls `log4j-slf4j2-impl`. Align the runtime binding to slf4j 2.x.
- **Root build + backend services:** add the `3.4.4` arm to the root `project/Dependencies.scala` match and compile the backend services.
- **Tests / golden outputs:** compile-green only; running the deeplang suites against 3.4.4 (the real behavioral regression check) is the next verification.

## Backend / root build (verified green on 3.4.4)

Added the `3.4.4` arm to the **root** `project/Dependencies.scala` and the same
`VersionScheme.Always` schemes (scala-xml, scala-parser-combinators) to the root `build.sbt`.
Backend source fixes (both JDK-11, not Spark):

| File | Change | Why |
|---|---|---|
| `backendcommons/.../config/ConfigToPropsLossy.scala` | `properties.putAll(map)` → per-entry `setProperty` | JDK 9+ makes `Properties.putAll(Map)` an ambiguous overload |
| `workflowexecutormqprotocol/.../MQCommunicationFactory.scala` | drop `T <: AnyRef` bound on `NotifyingChannelActor` class + `props` | Scala 2.12.17 enforces the bound at the `classOf` site; a `Unit` caller (sessionmanager broadcast subscriber) needs it unbounded |

**Verified:** every backend module compiles on 3.4.4 — `backendcommons`, `workflowmanager`
(`Compile/compile` `[success]`), and the aggregate root `compile` reaches all modules with
**0 Scala errors, 0 version conflicts**.

## Known environmental blocker (not a migration issue)
`workflowmanager`'s `generateWorkflowExamplesSql` resource-generator runs
`python2 generate_workflow_examples_sql.py` and fails with **exit 127** because `python2`
is not installed (this env has Python 3.8; target is 3.12). It would fail identically on
Spark 3.0.0. Fix belongs with the Python task (T51): port the script to `python3` and update
`WorkflowExamples.scala`. Does not affect Scala/Spark compilation.

## Status
- Shim arms + resolution: **done**.
- Full workflow-executor compile vs 3.4.4: **done (verified green)**.
- Root build + all backend services compile vs 3.4.4: **done (verified green)**; only the
  `python2` resource-generator blocks a full aggregate `compile` (environmental).
- Deeplang **test suite** vs 3.4.4 (behavioral regression): pending — the next verification gate.
