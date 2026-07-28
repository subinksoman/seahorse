# T02 — Regression baseline

**Phase:** 0 — Assessment · **Status:** partial (build baseline verified; full golden-output suite not runnable in this environment) · **Method:** sbt compile on the recorded toolchain.

## 1. Corrected current-state — the build JDK is Java 8, not 11

The plan (and the Dockerfile's `openjdk-11-jre`) implied JDK 11. **Verified otherwise:** the codegen'd `api` model classes reference `javax.annotation.Generated`, a package **removed from the JDK in Java 11**. Therefore:

| | Result | Evidence |
|---|---|---|
| `api/compile` on **Java 8** (1.8.0_202) | **SUCCESS** — 23 Java + Scala sources, `[success]` | verified |
| `api/compile` on **JDK 11** (11.0.27) | **FAIL** — `cannot find symbol: class Generated, package javax.annotation` | verified |

**Conclusion:** the real migration is **Java 8 → 17**, one major wider than the plan's "JDK 11 → 17". The `openjdk-11-jre` in the Spark image is a *runtime* JRE; Spark 3.0.0 runs on Java 8/11 at runtime, but the project *compiles* on Java 8.

## 2. Build toolchain (baseline)

- **JDK:** `/home/subinsoman/binaries/jdk1.8.0_202` (Java 8) — the only JDK that compiles the code as-is.
- **sbt:** 1.8.2 · **Scala:** 2.12.16 · **SPARK_VERSION:** 3.0.0 (default).
- Invocation: `JAVA_HOME=<jdk8> sbt -DSPARK_VERSION=3.0.0 <module>/compile`.

## 3. First concrete JDK-11+ blocker (feeds T11)

`javax.annotation.Generated` (JSR-250) was bundled in the JDK through Java 8 (`rt.jar`), deprecated in Java 9, and **removed in Java 11**. The Swagger/codegen output under `api/target/java/srcManaged/.../datasourcemanager/model/*.java` emits `@javax.annotation.Generated`.

**Fix for T11:** add the standalone artifact so the symbol resolves on JDK 11/17/21 —
```scala
// JDK 11+ no longer bundles javax.annotation
"javax.annotation" % "javax.annotation-api" % "1.3.2"
// or the Jakarta line if moving fully off javax:
// "jakarta.annotation" % "jakarta.annotation-api" % "2.1.1"
```
Apply to every module whose generated sources reference it (`api`, and anything re-generating Swagger/Thrift models). Confirm the codegen template doesn't hard-require the `javax` package name.

## 4. Baseline build status (this environment)

- `api/compile` on Java 8 — **green** (verified; 23 Java + Scala sources).
- `deeplang/compile` on Java 8 — **green** (verified; `SBT_EXIT=0`, `[success]`, **522 Scala + 1 Java sources, 44s**). Transitively compiled commons, api, graph, sparkutils3.0.x, csv3_0, readjson — i.e. the core of the workflow-executor builds clean on Java 8. Disk stayed at 4.4 GB (caches warm).

## 5. What a *complete* T02 baseline needs (not achievable here)

The full golden-output regression baseline — running the deeplang ML-operation test suites and snapshotting their outputs to diff after each Spark hop — is **not runnable in this environment**:

- **Disk:** ~4.4 GB free; the full multi-module test build plus fixtures needs more headroom.
- **External deps:** integration/e2e suites spin up Spark clusters, RabbitMQ, H2, and Docker images (see `e2etests/`, `StandaloneSparkClusterForTests`), unavailable here.

**When a fuller environment exists**, capture the baseline as:
```bash
JAVA_HOME=<jdk8> sbt -DSPARK_VERSION=3.0.0 test        # unit suites, record pass/fail per module
# snapshot deeplang operation outputs (golden files) for the diff harness used in T25/T42
```

## 6. Status

Build baseline **verified on Java 8** for `api` (and `deeplang`, per commit). Golden-output capture deferred to a fuller environment. The JDK-11 `javax.annotation` blocker is documented for T11. T02 marked **partial** until the golden outputs are captured.
