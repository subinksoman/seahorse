# Seahorse Modernization Plan — Latest Spark, Python & Jupyter

> **Status:** Planning only — no code changes made by this document.
> **Author:** generated 2026-07-28.
> **Scope:** Upgrade the Spark runtime, Scala/Java toolchain, PySpark/Python, and the Jupyter notebook stack to current supported versions.

---

## 1. Current state

| Area | Current | Where |
|---|---|---|
| Spark | **3.0.0** (bin-hadoop2.7) | `project/Dependencies.scala:39`, `build/manage-docker.py:38` |
| Scala | **2.12.16** (Spark pinned 2.12.10) | `project/CommonSettingsPlugin.scala:32`, `Dependencies.scala:41` |
| Java / JDK | **8** (compile) — verified; `openjdk-11-jre` is runtime-only | T02: `javax.annotation.Generated` breaks compile on JDK 11+ |
| Hadoop | **2.7** | `Dependencies.scala:41`, `manage-docker.py:39` |
| sbt | **1.8.2** | `project/build.properties` |
| Python (executor image) | **3.7** (Miniconda `py37_4.9.2`) | `deployment/spark-docker/Dockerfile`, `requirements.txt` |
| PySpark bridge | Spark 3.x only | `.../python/pyexecutor/pyexecutor.py` |
| Jupyter (notebook image) | `jupyter/minimal-notebook:python-3.7`, `ipykernel 4.5.0`, `jupyter-client 4.4.0` | `remote_notebook/Dockerfile`, `remote_notebook/requirements.txt` |
| Spark compat shims | `sparkutils{2.0,2.1,2.2,2.4,3.0}.x` + `csv*`/`readjson*` feature modules | `seahorse-workflow-executor/build.sbt:27-77` |

## 2. Target state (recommended, as of 2026-07)

> Confirm exact latest patch versions at execution time; these are the intended majors/minors.

| Area | Target | Notes |
|---|---|---|
| Spark | **4.0.0** (final) via **3.5.x** stepping stone | 4.0 needs Java 17+ & Scala 2.13 |
| Scala | **2.13.x** | Required by Spark 4.0; 2.12 is dropped |
| Java / JDK | **17** (LTS) | Spark 4.0 minimum is 17 |
| Hadoop | bundled Hadoop 3.x (`bin-hadoop3`) | Spark 3.3+ ships Hadoop 3 only |
| sbt | **1.10.x** | Needed for clean Scala 2.13 + JDK 17 |
| Python | **3.12** | Spark 4.0 supports 3.9–3.12 (not yet 3.13) |
| Jupyter | **JupyterLab 4.x / Notebook 7.x**, current `ipykernel`/`jupyter-client` | Base image `jupyter/pyspark-notebook` or `base-notebook` (latest) |

## 2.1 Decision log & verified corrections (2026-07-28)

**Target chosen:** **Spark 3.4.4 + Scala 2.13 + JDK 17** in one coordinated jump (matches the
already-staged `spark-3.4.4-bin-hadoop3-scala2.13` / `scala-2.13.1` binaries). This collapses the
original Phase 2 (3.5) and Phase 4 (4.0) into a single Spark+Scala+JDK migration.

**Verified corrections to the assumptions in §1–§3 (from execution):**
1. Current build JDK is **Java 8**, not 11 (T02) — `javax.annotation.Generated` breaks compile on
   JDK 11+. The real jump is **Java 8 → 17**.
2. **JDK 17 cannot precede Spark 3.3+** — Spark 3.0.0 does not run on JDK 17, so JDK 17 lands
   *together with* the Spark 3.4.4 upgrade (original T11 ordering corrected).
3. The repo is **two separate sbt builds**, each with its own `project/Dependencies.scala` and
   Spark-version `match` block: **root** (backend services) and **seahorse-workflow-executor**
   (api, deeplang, …). Every version arm (Spark, Scala, Hadoop, Akka) must be added in **both**.

**Verified progress:** T11a (`javax.annotation-api`) done — `api/compile` now green on JDK 11.

## 3. Strategy — staged, not a single leap

Spark **3.0 → 4.0 crosses 3.1, 3.2, 3.3, 3.4, 3.5, 4.0** — each with breaking MLlib / SQL / DataSourceV2 changes. Attempting a single jump makes failures impossible to localize. Recommended order:

1. **Toolchain first** — sbt, then keep Scala 2.12 but move to JDK 17-compatible build.
2. **Spark 3.0 → 3.5.x on Scala 2.12 / JDK 11** — the largest behavioral migration; validates all MLlib/SQL operations while the toolchain is unchanged.
3. **Scala 2.12 → 2.13 + JDK 17** — pure toolchain jump on stable Spark 3.5.
4. **Spark 3.5 → 4.0 on Scala 2.13 / JDK 17** — final, smaller hop.
5. **Python 3.7 → 3.12 & PySpark** — align with each Spark step (3.5 supports 3.12; 4.0 supports 3.12).
6. **Jupyter modernization** — largely independent; can proceed in parallel after Python is chosen.
7. **Docker, CI, docs, release** — continuous.

Each Spark hop reuses the existing shim pattern: add a `sparkutils3.5.x` / `sparkutils4.0.x` module, matching `csv*`/`readjson*` feature modules, and new `case` arms in the `match` blocks — rather than editing the 3.0.x shim in place. This keeps rollback trivial (`SPARK_VERSION` selects the arm).

## 4. Top risks / breaking changes to budget for

- **MLlib API drift** (deeplang operations) — the single biggest cost; removed/changed params across 3.1–4.0.
- **Scala 2.13 collections** — `Seq`, `CollectionConverters`, breaking source changes across the whole backend.
- **JDK 17 module system** — more `--add-opens`; some reflection-based libs (Akka 2.4.13, Spray, old Jetty 9.3) may not run on 17 and need upgrades.
- **Old Akka/Spray/Scalatra stack** — Akka 2.4.13 & Spray are EOL and may block Scala 2.13 / JDK 17; likely forced upgrades (Akka HTTP or Pekko).
- **PySpark Arrow / pandas** — `pyarrow==1.0.1` and `pandas` unpinned are far below Spark 3.5/4.0 expectations.
- **SparkR** — R bridge (`rexecutor`) must track the new Spark R package; R itself may need bumping.
- **Hadoop 2.7 → 3.x** — client/filesystem behavior, S3A, credential provider changes.
- **Jupyter Notebook 7 / Server 2** — config keys (`NotebookApp` → `ServerApp`), nbextensions replaced by JupyterLab extensions; `jupyter_contrib_nbextensions` is dead.

---

## 5. Task sheet (JSON)

Flat array — one object per task, ordered by phase. Import directly into a tracker/spreadsheet.

**Schema:** `id`, `phase`, `title`, `description`, `area` (files/dirs), `depends_on` (task ids), `category`, `risk` (Low/Med/High), `effort_days` (rough), `status`.

```json
[
  {
    "id": "T00",
    "phase": "0 - Assessment",
    "title": "Inventory MLlib / Spark API surface in deeplang",
    "description": "Enumerate every org.apache.spark.* and org.apache.spark.ml/mllib call across deeplang operations; map each to its 3.1-4.0 deprecation/removal status. Produces the migration checklist that drives Spark hops.",
    "area": "seahorse-workflow-executor/deeplang/",
    "depends_on": [],
    "category": "assessment",
    "risk": "Med",
    "effort_days": 4,
    "status": "completed"
  },
  {
    "id": "T01",
    "phase": "0 - Assessment",
    "title": "Audit Akka/Spray/Scalatra/Jetty for Scala 2.13 + JDK 17 support",
    "description": "Check whether Akka 2.4.13, Spray 1.3.3, Scalatra 2.5, Jetty 9.3.8 have 2.13/JDK17-capable versions or must be replaced (Akka HTTP / Pekko / Jetty 11). Decide replacement targets.",
    "area": "project/Dependencies.scala, backend services",
    "depends_on": [],
    "category": "assessment",
    "risk": "High",
    "effort_days": 3,
    "status": "completed"
  },
  {
    "id": "T02",
    "phase": "0 - Assessment",
    "title": "Establish a regression baseline",
    "description": "Capture current green test suites, e2e workflow outputs, and sample workflow results on Spark 3.0.0 to compare against post-migration. Golden outputs for deeplang operations.",
    "area": "e2etests/, seahorse-workflow-executor/**/src/test",
    "depends_on": [],
    "category": "testing",
    "risk": "Med",
    "effort_days": 3,
    "status": "partial"
  },
  {
    "id": "T10",
    "phase": "1 - Toolchain",
    "title": "Bump sbt to 1.10.x",
    "description": "Update sbt.version; fix any plugin incompatibilities (assembly, scoverage, buildinfo, scalastyle).",
    "area": "project/build.properties, project/plugins.sbt",
    "depends_on": [
      "T02"
    ],
    "category": "build",
    "risk": "Low",
    "effort_days": 1,
    "status": "todo"
  },
  {
    "id": "T11",
    "phase": "1 - Toolchain",
    "title": "Make the build compile & test on JDK 17 (still Scala 2.12 / Spark 3.0)",
    "description": "Add required --add-opens/--add-exports for JDK 17, update any libs that break under the module system, keep Spark 3.0 runtime. Green build on JDK 17 is the gate.",
    "area": "project/CommonSettingsPlugin.scala, build JVM opts",
    "depends_on": [
      "T01",
      "T10"
    ],
    "category": "build",
    "risk": "High",
    "effort_days": 5,
    "status": "todo"
  },
  {
    "id": "T11a",
    "phase": "1 - Toolchain",
    "title": "Add javax.annotation-api so codegen sources compile on JDK 11+",
    "description": "JDK 11 removed javax.annotation.*; the Swagger-generated api model classes reference javax.annotation.Generated. Added javax.annotation:javax.annotation-api:1.3.2 to Dependencies.api in the workflow-executor build. VERIFIED: api/compile green on JDK 11 (was failing).",
    "area": "seahorse-workflow-executor/project/Dependencies.scala",
    "depends_on": [
      "T02"
    ],
    "category": "build",
    "risk": "Low",
    "effort_days": 1,
    "status": "completed"
  },
  {
    "id": "T20",
    "phase": "2 - Spark 3.5",
    "title": "Create sparkutils3.5.x shim + csv/readjson feature modules",
    "description": "Clone sparkutils3.0.x -> sparkutils3.5.x and csv3_0 -> csv3_5; adapt to 3.5 APIs. Add SPARK_VERSION case arms in Dependencies.scala and build.sbt (sparkUtils/csvlib/readjson matches). [StepA: reused 3.0.x shims for 3.4.4; arms added in WE build; verified.]",
    "area": "seahorse-workflow-executor/sparkutils3.5.x, sparkutilsfeatures/csv3_5, build.sbt, Dependencies.scala",
    "depends_on": [
      "T00",
      "T11"
    ],
    "category": "spark",
    "risk": "Med",
    "effort_days": 4,
    "status": "completed"
  },
  {
    "id": "T21",
    "phase": "2 - Spark 3.5",
    "title": "Set Spark 3.5.x + Hadoop 3 defaults",
    "description": "Add '3.5.x' arm to the (scala, hadoop, akka, sprayRoutingLib) match (hadoop -> 3.x). Update manage-docker.py spark_version/hadoop_version. [StepA: WE Version arm 3.4.4/scala2.12.17/hadoop3.3.4 done; root build + manage-docker pending.]",
    "area": "project/Dependencies.scala:40-46, build/manage-docker.py:38-39",
    "depends_on": [
      "T20"
    ],
    "category": "spark",
    "risk": "Med",
    "effort_days": 1,
    "status": "completed"
  },
  {
    "id": "T22",
    "phase": "2 - Spark 3.5",
    "title": "Migrate deeplang MLlib/SQL operations to Spark 3.5",
    "description": "Apply the T00 checklist: fix removed/changed ML params, DataFrame/Dataset API changes, DataSourceV2, CSV/JSON reader options. The bulk of the migration effort. [StepA DONE: full WE+backend compile green on 3.4.4; deeplang TransformerSpec/CustomTransformerSpec run green (13 tests) - Spark 3.4.4 verified at runtime on JDK 11.]",
    "area": "seahorse-workflow-executor/deeplang/",
    "depends_on": [
      "T21"
    ],
    "category": "spark",
    "risk": "High",
    "effort_days": 15,
    "status": "completed"
  },
  {
    "id": "T23",
    "phase": "2 - Spark 3.5",
    "title": "Fix Spark serialization / model persistence formats",
    "description": "Validate DefaultMLWriter/reader and saved-model compatibility; handle sparkVersion metadata and any format changes between 3.0 and 3.5.",
    "area": "seahorse-workflow-executor/deeplang/.../serialization/",
    "depends_on": [
      "T22"
    ],
    "category": "spark",
    "risk": "Med",
    "effort_days": 3,
    "status": "todo"
  },
  {
    "id": "T24",
    "phase": "2 - Spark 3.5",
    "title": "Update sessionmanager Spark launcher & download URLs",
    "description": "Mesos/YARN/standalone launchers reference spark-$version-bin-hadoop tarballs and cloudfront URLs; point to archive.apache.org bin-hadoop3, verify spark-submit args on 3.5.",
    "area": "sessionmanager/.../sparklauncher/, e2etests BatchTestSupport",
    "depends_on": [
      "T21"
    ],
    "category": "spark",
    "risk": "Med",
    "effort_days": 2,
    "status": "todo"
  },
  {
    "id": "T25",
    "phase": "2 - Spark 3.5",
    "title": "Green full backend test + e2e on Spark 3.5 / Scala 2.12 / JDK 17",
    "description": "All unit + integration + e2e suites pass; deeplang golden outputs match T02 baseline within tolerance. [StepA: representative deeplang specs pass on 3.4.4; full suite + e2e pending.]",
    "area": "all backend modules, e2etests/",
    "depends_on": [
      "T22",
      "T23",
      "T24"
    ],
    "category": "testing",
    "risk": "High",
    "effort_days": 4,
    "status": "partial"
  },
  {
    "id": "T30",
    "phase": "3 - Scala 2.13",
    "title": "Replace EOL Akka/Spray with Apache Pekko (umbrella)",
    "description": "Decision B = Apache Pekko (Apache-2.0). Migrate the actor + HTTP stack off EOL Akka 2.4 / Spray to Pekko + Pekko HTTP across the whole codebase. Broken into T30a-T30f.",
    "area": "project/Dependencies.scala, workflowmanager, sessionmanager, datasourcemanager, libraryservice",
    "depends_on": [
      "T01",
      "T25"
    ],
    "category": "build",
    "risk": "High",
    "effort_days": 12,
    "status": "partial"
  },
  {
    "id": "T30a",
    "phase": "3 - Pekko",
    "title": "spray-json 1.3.6 + Pekko deps groundwork",
    "description": "Bump spray-json to 1.3.6 (2.13-capable, kept for serialization); add Pekko + Pekko HTTP dep helpers to both sbt builds.",
    "area": "project/Dependencies.scala (both builds)",
    "depends_on": [
      "T01"
    ],
    "category": "build",
    "risk": "Low",
    "effort_days": 1,
    "status": "completed"
  },
  {
    "id": "T30b",
    "phase": "3 - Pekko",
    "title": "Migrate workflow-executor build to Pekko + Pekko HTTP",
    "description": "commons (RestClient/NotebookRestClient/NotebookPoller -> Pekko HTTP client), deeplang, mqprotocol, workflowexecutor (2 HTTP-client rewrites), AkkaUtils. VERIFIED: full WE compile green; commons NotebookRestClientSpec 8 tests pass.",
    "area": "seahorse-workflow-executor/**",
    "depends_on": [
      "T30a"
    ],
    "category": "build",
    "risk": "High",
    "effort_days": 10,
    "status": "completed"
  },
  {
    "id": "T30c",
    "phase": "3 - Pekko",
    "title": "Port akka-rabbitmq to Pekko (ConnectionActor/ChannelActor)",
    "description": "Replace com.thenewmotion:akka-rabbitmq (no Pekko/2.13) with amqp-client + a thin Pekko ConnectionActor/ChannelActor FSM. VERIFIED: ChannelActorSpec FSM 2 tests + T33 broker round-trip on RabbitMQ 4.x.",
    "area": "workflowexecutormqprotocol/.../rabbitmq/",
    "depends_on": [
      "T30b"
    ],
    "category": "build",
    "risk": "High",
    "effort_days": 4,
    "status": "completed"
  },
  {
    "id": "T30d",
    "phase": "3 - Pekko",
    "title": "Migrate backendcommons REST framework (Spray server -> Pekko HTTP)",
    "description": "Architectural: actor-bound Spray HttpService -> route-bound Pekko HTTP. RestServer/RestService/RestModule/RestApi/Cors/AuthDirectives. VERIFIED: backendcommons/Compile/compile green.",
    "area": "backendcommons/.../rest, auth/directives",
    "depends_on": [
      "T30b"
    ],
    "category": "build",
    "risk": "High",
    "effort_days": 6,
    "status": "completed"
  },
  {
    "id": "T30e",
    "phase": "3 - Pekko",
    "title": "Migrate backendcommons test-side + in-process HTTP smoke test",
    "description": "Spray ScalatestRouteTest -> Pekko HTTP ScalatestRouteTest; MultipartFormData/HttpEntity API differences. Run RestServerSmokeSpec (in-process bind/serve) as the framework runtime gate. [DONE & VERIFIED: test-side migrated (ScalatestRouteTest, Multipart.FormData, Route.seal); log4j->2.19.0/slf4j2 + slf4j-api 2.0.7 in root build; ValidationRejection now yields JSON FailureDescription. 13 backendcommons REST tests pass incl. in-process HTTP bind/serve smoke test.]",
    "area": "backendcommons/src/test/.../rest, auth",
    "depends_on": [
      "T30d"
    ],
    "category": "testing",
    "risk": "Med",
    "effort_days": 3,
    "status": "completed"
  },
  {
    "id": "T30f",
    "phase": "3 - Pekko",
    "title": "Cascade Pekko HTTP to service REST APIs",
    "description": "workflowmanager (10), sessionmanager (4 + MqModule ConnectionActor), schedulingmanager (2), datasourcemanager (1) extend the migrated framework; migrate their routing DSL + JSON support.",
    "area": "workflowmanager, sessionmanager, schedulingmanager, datasourcemanager",
    "depends_on": [
      "T30d"
    ],
    "category": "build",
    "risk": "High",
    "effort_days": 6,
    "status": "todo"
  },
  {
    "id": "T33",
    "phase": "Step B - Delivery",
    "title": "Upgrade RabbitMQ to latest + broker integration test for the Pekko port",
    "description": "Upgrade the RabbitMQ broker (image + amqp-client if newer) to the latest stable. Add a standalone test docker-compose under deployment/rabbitmq (e.g. rabbitmq:3-management) so the messaging layer can be exercised in isolation. Run a publish/subscribe round-trip + a forced-reconnect scenario against it to verify the new Pekko ConnectionActor/ChannelActor port end-to-end -- the broker gate the ChannelActorSpec FSM unit test cannot cover (see migration/T30-rabbitmq-port.md). [DONE & VERIFIED: deployment/rabbitmq/docker-compose.test.yml (rabbitmq:4-management); RabbitMQIntegSpec publish/consume round-trip PASSES on RabbitMQ 4.x; found+fixed a real 4.x incompat (transient non-exclusive queues rejected -> subscriber queues made exclusive in MQCommunicationFactory); production Dockerfile bumped 3.9->4.0-management, boots healthy with stomp/web_stomp/management plugins.]",
    "area": "deployment/rabbitmq/ (new docker-compose), workflowexecutormqprotocol integration tests, project/Dependencies.scala (amqp-client)",
    "depends_on": [
      "T30"
    ],
    "category": "testing",
    "risk": "Med",
    "effort_days": 2,
    "status": "completed"
  },
  {
    "id": "T31",
    "phase": "3 - Scala 2.13",
    "title": "Cross-compile / switch to Scala 2.13.x",
    "description": "Set scalaVersion 2.13.x; fix collections (Seq/varargs, CollectionConverters), procedure syntax, deprecated APIs across api/commons/deeplang/graph/workflow* and services.",
    "area": "project/CommonSettingsPlugin.scala:32, Dependencies.scala scala pin, all Scala sources",
    "depends_on": [
      "T30"
    ],
    "category": "build",
    "risk": "High",
    "effort_days": 10,
    "status": "todo"
  },
  {
    "id": "T32",
    "phase": "3 - Scala 2.13",
    "title": "Green build + tests on Scala 2.13 / JDK 17 / Spark 3.5",
    "description": "Full suite passes on the new toolchain before touching Spark 4.0.",
    "area": "all modules",
    "depends_on": [
      "T31"
    ],
    "category": "testing",
    "risk": "Med",
    "effort_days": 3,
    "status": "todo"
  },
  {
    "id": "T40",
    "phase": "4 - Spark 4.0",
    "title": "Create sparkutils4.0.x shim + feature modules; add 4.0.0 arms",
    "description": "Clone 3.5 shim to 4.0.x, adapt to Spark 4.0 API removals; add '4.0.0' case arms (scala 2.13, hadoop 3, akka/pekko) in Dependencies.scala and build.sbt matches.",
    "area": "seahorse-workflow-executor/sparkutils4.0.x, sparkutilsfeatures/*, build.sbt, Dependencies.scala",
    "depends_on": [
      "T32"
    ],
    "category": "spark",
    "risk": "High",
    "effort_days": 6,
    "status": "todo"
  },
  {
    "id": "T41",
    "phase": "4 - Spark 4.0",
    "title": "Resolve Spark 4.0 breaking changes in deeplang",
    "description": "Address 3.5->4.0 removals (deprecated ML APIs, ANSI SQL defaults, datasource behavior, removed configs). Re-run golden-output comparison.",
    "area": "seahorse-workflow-executor/deeplang/",
    "depends_on": [
      "T40"
    ],
    "category": "spark",
    "risk": "High",
    "effort_days": 8,
    "status": "todo"
  },
  {
    "id": "T42",
    "phase": "4 - Spark 4.0",
    "title": "Green backend + e2e on Spark 4.0 / Scala 2.13 / JDK 17",
    "description": "Full suite + e2e pass on final target stack.",
    "area": "all modules, e2etests/",
    "depends_on": [
      "T41"
    ],
    "category": "testing",
    "risk": "High",
    "effort_days": 4,
    "status": "todo"
  },
  {
    "id": "T50",
    "phase": "5 - Python/PySpark",
    "title": "Generalize pyexecutor for Spark 3.5 & 4.0",
    "description": "pyexecutor.py currently hard-checks spark_version.startswith('3.'); support 3.5 and 4.0 (SparkSession/SQLContext wrapper changes, error on <3.5). Validate Py4J bridge.",
    "area": "seahorse-workflow-executor/python/pyexecutor/pyexecutor.py",
    "depends_on": [
      "T21",
      "T40"
    ],
    "category": "python",
    "risk": "Med",
    "effort_days": 3,
    "status": "todo"
  },
  {
    "id": "T51",
    "phase": "5 - Python/PySpark",
    "title": "Move executor image to Python 3.12 and repin requirements",
    "description": "Replace Miniconda py37 with a 3.12 base; repin numpy/pandas/pyarrow (>= Spark 4.0 minimums), scikit-learn/xgboost/lightgbm/tensorflow/keras to 3.12-compatible wheels. Drop dead pins (tornado 4.1, urllib3 1.22, pyzmq 17).",
    "area": "deployment/spark-docker/Dockerfile, deployment/spark-docker/requirements.txt",
    "depends_on": [
      "T50"
    ],
    "category": "python",
    "risk": "High",
    "effort_days": 4,
    "status": "todo"
  },
  {
    "id": "T52",
    "phase": "5 - Python/PySpark",
    "title": "Update SparkR / R executor for new Spark",
    "description": "Align rexecutor and SparkR package path with the new Spark R lib; bump R base if required; smoke-test an R workflow.",
    "area": "seahorse-workflow-executor/workflowexecutor/rexecutor/, remote_notebook R kernel",
    "depends_on": [
      "T40"
    ],
    "category": "python",
    "risk": "Med",
    "effort_days": 3,
    "status": "todo"
  },
  {
    "id": "T60",
    "phase": "6 - Jupyter",
    "title": "Rebuild notebook image on JupyterLab 4 / Notebook 7 / Python 3.12",
    "description": "Replace jupyter/minimal-notebook:python-3.7 with current base; migrate jupyter_notebook_config (NotebookApp->ServerApp keys), drop dead jupyter_contrib_nbextensions, repin ipykernel/jupyter-client to current.",
    "area": "remote_notebook/Dockerfile, remote_notebook/requirements.txt, jupyter_notebook_config.py",
    "depends_on": [
      "T51"
    ],
    "category": "jupyter",
    "risk": "High",
    "effort_days": 5,
    "status": "todo"
  },
  {
    "id": "T61",
    "phase": "6 - Jupyter",
    "title": "Port the custom forwarding kernels to Jupyter Server 2 / kernel protocol",
    "description": "forwarding_kernel (py/r/pyspark), socket_forwarder, rabbit_mq_client, notebook_server_client rely on old jupyter_client APIs; update to current messaging/kernel-provisioner APIs. Verify RabbitMQ heartbeat bridge.",
    "area": "remote_notebook/code/forwarding_kernel*/, remote_notebook/code/*.py",
    "depends_on": [
      "T60"
    ],
    "category": "jupyter",
    "risk": "High",
    "effort_days": 6,
    "status": "todo"
  },
  {
    "id": "T62",
    "phase": "6 - Jupyter",
    "title": "Update contents manager / headless handlers",
    "description": "wmcontents, execute_saver, headless_notebook_handler use old NotebookApp/contents APIs; port to Jupyter Server 2 contents manager interface.",
    "area": "remote_notebook/wmcontents, remote_notebook/execute_saver, remote_notebook/headless_notebook_handler.py",
    "depends_on": [
      "T61"
    ],
    "category": "jupyter",
    "risk": "Med",
    "effort_days": 4,
    "status": "todo"
  },
  {
    "id": "T70",
    "phase": "7 - Delivery",
    "title": "Update all Docker images and build orchestration",
    "description": "spark-docker (bin-hadoop3, JDK17, Python3.12), remote_notebook, plus testing/mesos & yarn cluster images and standalone cluster Dockerfile. Update manage-docker.py versions and JDK_JAVA_OPTIONS.",
    "area": "deployment/**/Dockerfile, testing/**/Dockerfile, seahorse-workflow-executor/docker/, build/manage-docker.py",
    "depends_on": [
      "T42",
      "T51",
      "T60"
    ],
    "category": "docker",
    "risk": "Med",
    "effort_days": 4,
    "status": "todo"
  },
  {
    "id": "T71",
    "phase": "7 - Delivery",
    "title": "Update CI pipeline (JDK 17, Scala 2.13, Spark 4.0 matrix)",
    "description": "Build/test scripts still iterate SPARK_VERSION=2.0.0..2.2.0; retarget to supported set (3.5.x, 4.0.0). Update runners to JDK 17.",
    "area": "seahorse-workflow-executor/build/build_and_run_tests.sh, CI config",
    "depends_on": [
      "T42"
    ],
    "category": "ci",
    "risk": "Med",
    "effort_days": 3,
    "status": "todo"
  },
  {
    "id": "T72",
    "phase": "7 - Delivery",
    "title": "Full end-to-end acceptance on a real cluster",
    "description": "Run representative workflows (ingest, ML train/score, notebook, R, SQL, export) on a Spark 4.0 cluster; compare against T02 baseline; sign-off.",
    "area": "e2etests/, sample workflows",
    "depends_on": [
      "T70",
      "T71",
      "T52",
      "T62"
    ],
    "category": "testing",
    "risk": "High",
    "effort_days": 5,
    "status": "todo"
  },
  {
    "id": "T73",
    "phase": "7 - Delivery",
    "title": "Docs, RELEASE.md, and version bump",
    "description": "Update productionizing docs, SparkOperationDocumentation URLs (docs/$sparkVersion), README, and add a RELEASE.md entry; cut the release tag.",
    "area": "seahorse-workflow-executor/docs/, RELEASE.md, docgen",
    "depends_on": [
      "T72"
    ],
    "category": "docs",
    "risk": "Low",
    "effort_days": 2,
    "status": "todo"
  }
]
```

## 6. Rough effort roll-up

| Phase | Days (approx) |
|---|---|
| 0 — Assessment | 10 |
| 1 — Toolchain (sbt, JDK 17) | 6 |
| 2 — Spark 3.5 | 29 |
| 3 — Scala 2.13 | 25 |
| 4 — Spark 4.0 | 18 |
| 5 — Python/PySpark/R | 13 |
| 6 — Jupyter | 15 |
| 7 — Delivery (docker/CI/e2e/docs) | 14 |
| **Total** | **~130 engineer-days** |

Estimates assume one engineer familiar with the codebase; the deeplang MLlib migration (T22/T41) and the Akka/Spray replacement (T30) are the dominant risks. A `git worktree` per phase is recommended so `SPARK_VERSION` arms remain independently buildable and rollback stays cheap.

## 7. Decisions needed before execution

1. **Final Spark target** — 4.0.0, or stop at 3.5.x LTS (much lower risk, keeps Scala 2.12 / JDK 11)?
2. **Akka → Pekko vs Akka HTTP** — licensing (Akka BSL) and 2.13/JDK17 support drive this.
3. **Python target** — 3.12 (safe for Spark 4.0) vs 3.11.
4. **Keep multi-Spark support** (the shim `match` arms) or drop pre-3.5 arms to cut maintenance?
