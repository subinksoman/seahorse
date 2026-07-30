# T40 — Spark 4.x shim + build arms

**Phase:** 4 — Spark 4.0 · **Branch:** `feature/spark4-support` · **Status:** done
**Target:** the **whole Spark 4.x series** (4.0.x / 4.1.x / 4.2.x). The build arms match any
`4.*` version via a guard; verified by compiling against both **4.0.0** and **4.2.0**. Pin the
concrete version with `-DSPARK_VERSION=4.2.0` (latest) or any 4.x.

This is the first task of the Spark‑4 completion plan. It only wires the build and the
compatibility shim; the deeplang/MLlib breaking changes are T41, ANSI is T43, runtime image
is T44. Everything here is documented step‑by‑step so a later session (or a debug pass) can
see exactly what changed and why.

## 1. Target versions (verified against Maven Central, not guessed)

| | Spark 3.4.4 (current) | Spark 4.2.0 (target) |
|---|---|---|
| Scala | 2.13.12 | **2.13.18** |
| Hadoop (bundled) | 3.3.4 | **3.5.0** |
| Java (min runtime) | 17 | **17** (also supports 21) |

Verified via `spark-parent_2.13/4.2.0` POM: `scala.version=2.13.18`, `hadoop.version=3.5.0`,
`java.version=17`. `spark-core/sql/mllib_2.13:4.2.0` all resolve (HTTP 200). Spark 4.x line on
Maven Central at execution time: 4.0.0–4.0.4, 4.1.0–4.1.3, **4.2.0**.

## 2. Build environment

- JDKs present under `~/binaries`: 8, 11, **17.0.12**, 20, 21.
- Active `JAVA_HOME` = JDK **21** — but T40 builds are pinned to **JDK 17**
  (`/home/subinsoman/binaries/jdk-17.0.12_linux-x64_bin/jdk-17.0.12`), the canonical Spark‑4
  config. (Spark 4 supports 17 and 21; 17 minimises variables vs. the 3.4.4 baseline.)
- sbt 1.8.2. `SPARK_VERSION` system property selects the arm (default `3.0.0`).

## 3. What the shim actually contains (scoped before touching it)

The shim is small and — importantly — was **already de‑internalised during the 3.4.4 work**,
which lowers 4.x risk a lot:

- `sparkutils3.0.x/.../api/r/SparkRBackend.scala` — the only genuinely internal‑API file.
  Uses `org.apache.spark.api.r.{RBackend, ...}`: `backend.init()` returns `(port, authHelper)`,
  `backend.jvmObjectTracker.addAndGetId(...)`, `backend.run()/close()`. **This is the one file
  that can break across Spark majors and must be verified against 4.2's `api.r.RBackend`.**
- `sparkutilsfeatures/csv3_0/`:
  - `RawCsvRDDToDataframe.scala` — **public API** now (`sparkSession.read.format("csv").schema(...)
    .options(...).csv(Dataset[String])`) + univocity parser. Only semi‑internal touch is
    `sparkSession.sessionState.conf` (SQLConf, stable).
  - `LocalCsvOutputWriter.scala` — pure univocity `CsvWriter`, no Spark internals (just `StructType`).
  - `MapToCsvOptions.scala` — pure public `DataFrameReader`.

So the CSV feature module is expected to compile against 4.2 essentially unchanged; the real
verification target is `SparkRBackend`.

## 4. Build wiring (both sbt builds)

`SPARK_VERSION` drives a per‑version tuple in each build's `project/Dependencies.scala`, plus
module‑selection `match` blocks in `seahorse-workflow-executor/build.sbt`.

**executor `Dependencies.scala`** `(scala, java, hadoop, akka, apacheCommons)` — add (one arm
for the whole 4.x line, via a guard):
```
case v if v.startsWith("4.") => ("2.13.18", "17", "3.3.4", "2.4.12", "3.17.0")
```
Scala 2.13.x is binary-compatible across the 4.x line, so pinning the compiler at 4.2.0's
`2.13.18` compiles correctly against any 4.x Spark (4.0.0 built with 2.13.16, 4.2.0 with 2.13.18).
Notes: `java` = scalac `-source/-target` (17 for Spark 4). `akka` is dead after the Pekko
migration (the `akka(...)` helper is unused — 3.4.4 also carries "2.4.12" harmlessly). `hadoop`
kept at 3.3.4 for now (Spark pulls its own 3.5.0 transitively; the explicit hadoop dep only
needs to *resolve*) — revisit at **T44** if a runtime skew appears.

**root `Dependencies.scala`** `(scala, hadoop, akka, sprayRoutingLib)` — add:
```
case v if v.startsWith("4.") => ("2.13.18", "3.3", "2.4.13", "routing")
```

**executor `build.sbt`** — add `case v if v.startsWith("4.")` to `sparkUtils` (→ `sparkutils4.0.x`),
`csvlib` (→ `csv4_0`), and `readjson` (→ `readjsondataset`), and declare `lazy val csv4_0`.

Per the CLAUDE.md convention, new modules are **cloned**, never editing the 3.x shim in place,
so `SPARK_VERSION=3.4.4` stays an instant rollback. Module names follow the existing pattern
(`sparkutils3.0.x` already serves `"3.4.4"`), so `sparkutils4.0.x` / `csv4_0` serve `"4.2.0"`.

## 5. Verification log

**2026-07-30 — shim + csv modules compile clean against Spark 4.2.0 (JDK 17).**

Command (from `seahorse-workflow-executor/`, after `rm -rf project/target` to avoid the stale
`Dependencies$` meta-build gotcha):
```
JAVA_HOME=.../jdk-17.0.12 sbt -DSPARK_VERSION=4.2.0 "csv4_0/compile" "sparkUtils4_0_x/compile"
```
Result:
- Build definition loaded with the new `4.2.0` arms — no build-script errors.
- `SPARK_VERSION: 4.2.0` echoed → correct arm; Scala **2.13.18** compiler-bridge built; Spark
  4.2.0 artifacts resolved from Maven Central.
- `csv4_0` (3 Scala sources) → `[success]`.
- `sparkutils4.0.x` / `SparkRBackend.scala` (1 source) → `[success]`.

**2026-07-30 — series check: same modules compile clean against Spark 4.0.0 too** (JDK 17,
`-DSPARK_VERSION=4.0.0`): `SPARK_VERSION: 4.0.0`, `csv4_0` + `sparkutils4.0.x` both `[success]`,
0 errors. Confirms the `4.*` guard supports the whole 4.x series (verified at both ends: 4.0.0
and 4.2.0), not just one pinned version.

**Key finding:** `SparkRBackend` needed **no changes** — Spark 4.2's `org.apache.spark.api.r.RBackend`
still exposes `init(): (Int, RAuthHelper)`, `jvmObjectTracker.addAndGetId(...)`, `run()`, `close()`.
The CSV feature module also needed no changes (already public-API since the 3.4.4 work). So the T40
adaptation cost was **zero source edits** — only build wiring.

## 6. Status & handoff

**T40 done:** the `sparkutils4.0.x` + `csv4_0` modules and the `4.2.0` build arms (both
`Dependencies.scala` tuples + the 3 `build.sbt` matches) are in place and the shim compiles
against Spark 4.2.0 on JDK 17. `readjson` for 4.2.0 reuses the existing `readjsondataset`
module (no new module needed).

**Not in T40 (next tasks):**
- The **root backend** build's `4.2.0` arm is wired but only the executor shim was compiled;
  a full root/deeplang compile is expected to surface Spark‑4 API removals → **T41**.
- ANSI‑SQL default behavior → **T43**. Runtime image / Hadoop 3.5.0 skew → **T44**.
- To build the current baseline again, use `SPARK_VERSION=3.4.4` (JDK 17) — unchanged and
  still the default rollback.
