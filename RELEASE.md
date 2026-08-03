# Seahorse Release 4.2.0.3

| | |
|---|---|
| **Tag** | `v4.2.0.3` |
| **Release date** | 2026-08-03 |
| **Previous tag** | `v4.2.0.2` |
| **Type** | Frontend dependency security upgrade (patch) |
| **Stack** | Unchanged — Spark **4.2.0** / Scala 2.13.18 / JDK 17 / Python 3.12 |
| **Frontend** | **AngularJS 1.5.11 → 1.8.3** |
| **Images** | Only `seahorse-frontend` changes; all other services identical to 4.2.0.2 |

## Summary
A **frontend-only** security patch: upgrades the AngularJS runtime from the unpatched
**1.5.11** to **1.8.3** — the final AngularJS release, which carries the `$sce`/`ngSanitize`
XSS and prototype-pollution fixes 1.5.11 lacks. No backend, Spark, notebook, or Python
changes; those images are identical to 4.2.0.2. This is the first execution cluster of the
frontend-security initiative tracked as **T80/T81** (see `migration/T80-frontend-security-upgrade.md`).

> **Note:** AngularJS is end-of-life (last release 1.8.3, support ended Jan 2022). This
> removes the known CVEs in 1.5.11 but AngularJS itself remains EOL; the durable fix is a
> framework migration, tracked separately (T80 Phase C).

## What changed
- **`angular` + `angular-cookies` + `angular-sanitize` + `angular-mocks` → 1.8.3** (bumped in
  lockstep; `package-lock.json` regenerated). `angular-ui-router` 0.2.18 and
  `angular-ui-bootstrap` 1.1.2 verified to bootstrap on 1.8.
- Fixed **six AngularJS 1.7 binding-migration regressions** (Angular 1.7 removed
  `preAssignBindingsEnabled`, so component/directive bindings are no longer assigned before
  the controller constructor — code reading a binding in its constructor now breaks). Found
  via a read-before-assign scanner over class / function / string-named controllers; all
  fixed by moving the read to `$onInit`:
  - `editor.controller.js` — `$scope.$watch(this.workflow.getNodes, …)` in the constructor
    threw and left the **editor canvas empty (no nodes)**.
  - `graph-node.component.js` / `status-icon.component.js` — read `this.node` (node internals).
  - `distribution-continuous-chart.js` — read `this.data` (box-plot option silently dropped).
  - `report-table.controller.js` — `activate()` read `this.table.columnNames` at construction
    and threw, leaving **reports blank**.
  - `reports.controller.js` — read `this.currentReport` at construction.
- `app.config.js` — removed the now-invalid `$compileProvider.preAssignBindingsEnabled(true)`
  call (removed in Angular 1.7; it threw `$injector:modulerr` and killed bootstrap); kept
  `$locationProvider.hashPrefix('')` so `#/…` URLs are unchanged.
- **Comprehensive controller audit** — other 1.6/1.7/1.8 categories swept clean: `$http`
  `.success()/.error()` (0), removed globals `angular.lowercase/uppercase` (0), `$cookies`
  direct property access (0), `ng-bind-html` (2 static app-defined strings, safe).

## Verification
Headless-Chrome smoke against a live 4.2.0.x stack: the app bootstraps under `ng-strict-di`,
`ui-router` routes, and the **workflow editor renders the full graph** (a 5-node workflow —
Read DataFrame → Python Transformation → Write DataFrame plus two Python Notebooks — with
jsPlumb edges); STOMP connects to RabbitMQ, subscribes, and syncs with the executor.

## Known issues / notes
- One **single-fire `reading 'id'`** console error during editor init — non-blocking (nodes
  render correctly).
- **Report distribution charts** render correctly, but Seahorse emits a *simplified* report
  (no distributions/charts) for DataFrames with **≥ 20 columns**
  (`DataFrameReportGenerator.ColumnNumberToGenerateSimplerReportThreshold`) — a backend
  perf guard, unrelated to this frontend upgrade. Charts appear for DataFrames with < 20
  columns.
- Full-run smoke (execute a workflow end-to-end, notebook `toPandas`, file upload) is
  recommended before treating T81 as fully closed.

## Upgrade
Rebuild/redeploy **`seahorse-frontend`** only; all other 4.2.0.2 images are unchanged. No
config migration. A browser hard-refresh is required to drop the cached old bundle.

---

# Seahorse Release 4.2.0.2

| | |
|---|---|
| **Tag** | `v4.2.0.2` |
| **Release date** | 2026-07-31 |
| **Previous tag** | `v4.2.0.1` |
| **Type** | Notebook / messaging / logging fixes (patch) |
| **Spark** | **4.2.0** (bin-hadoop3, Scala **2.13.18**) on **JDK 17** |
| **Images** | `subinksoman/ae-<svc>:4.2.0.2` |

## Summary
A patch on top of 4.2.0.1 — same Spark 4.2.0 / Scala 2.13.18 / JDK 17 / Python 3.12
stack — that hardens the interactive notebook path and cleans up notebook naming and
custom-code logs. No API, build-arm, or dependency changes; a straight image bump
from 4.2.0.1.

## Fixes
- **Interactive kernels stay connected** — raised RabbitMQ `consumer_timeout` to
  7 days so long-lived, unacked kernel delivery channels are no longer force-closed
  (the RabbitMQ 4.x 30-min default was killing idle PySpark kernels with a 406
  `PRECONDITION_FAILED`).
- **Kernel restart recovers** — the notebook's RabbitMQ client now auto-reconnects
  and replays its subscriptions on a dropped channel/connection, so "Restart kernel"
  works again after a broker-side close instead of hanging.
- **Readable notebook tab/header** — the Jupyter tab/header showed the base64 params
  blob (Notebook 7 titles from the path basename). Notebooks now carry a readable
  last path segment derived from the **node's own name** (falling back to a language
  label), so each notebook is titled and distinguishable. The full path stays unique
  per node, so identical display names never collide.
- **Quieter custom code & cells** — the benign "DataFrame constructor is internal"
  `UserWarning` (from wrapping a JVM DataFrame, the supported toPandas path) is now
  suppressed both in the executor (Python Transformation) and at the notebook cell
  call site.

## Upgrade
Image-only bump. Pull/redeploy `subinksoman/ae-<svc>:4.2.0.2` (frontend, notebooks,
rabbitmq, sessionmanager carry changes; the rest are 4.2.0.1 rebuilt/retagged). No
config migration.

---

# Seahorse Release 4.2.0.1

| | |
|---|---|
| **Tag** | `v4.2.0.1` |
| **Release date** | 2026-07-31 |
| **Previous tag** | `v3.0.0.8` |
| **Type** | Apache Spark 4.x support (feature) |
| **Spark** | **4.2.0** (bin-hadoop3, Scala **2.13.18**) on **JDK 17** |
| **Images** | `subinksoman/ae-<svc>:4.2.0.1` |

## Summary
Adds support for the **Apache Spark 4.x line (verified up to 4.2.0)** on top of the
3.0.0.8 modernization, and ships it end-to-end verified: both sbt builds compile,
the deeplang unit suite is green under Spark 4's ANSI-SQL default, and a full
workflow (Read → Python Transformation w/ `toPandas` → Write, plus a notebook)
runs on a live Spark 4.2 stack. `SPARK_VERSION` still selects the arm — `3.4.4`
remains the rollback; `4.2.0` is the new default target for this image set.

## Highlights
- **Spark 4.x arm** — `sparkutils4.0.x` shim + `csv4_0`/readjson feature modules and
  new build arms (`case v if v.startsWith("4.")`) across both `Dependencies.scala`
  files and `build.sbt`; the whole 4.x line (4.0.0–4.2.0) is covered.
- **Scala 2.13.18 / Hadoop 3 / JDK 17**; the executor & services run with the Spark-4
  `--add-opens` set (incl. `sun.security.ssl`).
- **Backend on Spark 4** — aligned json4s to **4.0.7** and scalatra to **2.8.4**
  (Spark 4 bundles json4s 4.x); a build-time patch fixes the swagger-generated
  json4s-3 idioms in `schedulingmanager`/`datasourcemanager` so all backend modules
  compile.
- **PySpark 4.2** — `pyexecutor`/`code_executor` now build the SparkSession/SQLContext
  the supported way, so custom-code `df.toPandas()` works (fixes the
  `'WrappedHelper' has no attribute '_jconf'` error); the executor's Spark-version
  gate accepts 4.x.
- **Python/ML stack bumped** — pandas **2.3** (`>=2.2`), pyarrow **25** (`>=18`),
  numpy **2.4.6** (`>=2,<2.5`, the newest the ML stack supports).
- **SparkR** verified on 4.2; **ML model persistence** (save/load) verified on 4.2.
- **Reliability** — RabbitMQ initial-connection retry (no more sessionmanager
  boot-race crash); Spark tarball download falls back archive→dlcdn with timeouts;
  pip install uses longer timeouts/retries.
- **Notebook** — kernel WebSocket keepalive ping (fixes the idle "kernel unknown");
  readable notebook display name.
- **Logging** — standardized around a single `LOG_LEVEL` env var (settable from
  docker-compose); executor logs are prefixed with the workflow id and log each
  step (`Executing node …` / `Workflow progress: N/total`); PyExecutor lifecycle
  and sessionmanager session lifecycle logs cleaned up.
- **Build/publish** — `manage-docker.py` honors `SPARK_VERSION`/`HADOOP_VERSION`
  and publishes `<repository>/<prefix>-<name>:<version>` (all three configurable);
  the 4.2.0.1 image set is published to Docker Hub.

---

# Seahorse Release 3.0.0.8

| | |
|---|---|
| **Tag** | `v3.0.0.8` |
| **Release date** | 2026-07-30 |
| **Previous tag** | `v3.0.0.7` |
| **Type** | Platform modernization (major) |
| **Spark** | **3.4.4** (bin-hadoop3, Scala 2.13) on **JDK 17** |

## Summary
A coordinated modernization of the entire Seahorse platform off the end-of-life
Spark 3.0.0 / Scala 2.12 / JDK 8 / Python 3.7 baseline onto a current, supported
runtime. This lifts the Spark engine, the Scala/Java toolchain, the actor/HTTP
stack, the Python/PySpark/SparkR runtime, the Jupyter notebook stack, the frontend
build, and the Docker image set — with the full backend test suite green and the
full `docker compose` stack verified end-to-end.

The migration was executed as a tracked, task-by-task effort; the plan and per-task
status live in [update.md](update.md). See [README.md](README.md) for the updated
architecture and build/run guide.

## Upgrade matrix

| Area | Was (≤ 3.0.0.7) | Now (3.0.0.8) |
|---|---|---|
| Apache Spark | 3.0.0 (bin-hadoop2.7) | **3.4.4** (bin-hadoop3, Scala 2.13 distribution) |
| Scala | 2.12.x | **2.13.12** |
| JDK | 8 / 11 | **17 (LTS)** |
| Actor / HTTP stack | Akka 2.4 + Spray | **Apache Pekko 1.1 + Pekko HTTP 1.1** |
| RabbitMQ | 3.x (SockJS web-stomp) | **4.x** (raw-WebSocket web-stomp) |
| Python (executor & notebook) | 3.7 | **3.12** |
| Jupyter | Notebook classic / Server 1 | **Jupyter Server 2 / Notebook 7 / JupyterLab 4** |
| Frontend build | prebuilt bundle (webpack 1 config unbuildable) | **built from source** (webpack 2, Node 22) |
| Build tooling | Python 2 helper scripts | **Python 3** |

## Changes

### Spark / Scala / JDK
- Migrated **both** sbt builds (root services + `seahorse-workflow-executor`) to
  **Spark 3.4.4** on **Scala 2.13.12** and **JDK 17**, via the existing
  `sparkutils<ver>` shim + `csv*`/`readjson*` feature-module pattern.
- Added the Spark 3.4 `--add-opens` set for JDK 17, plus
  `--add-opens=java.base/sun.security.ssl=ALL-UNNAMED` for the executor's HTTPS client.
- **Scala 2.13 distribution required:** the `seahorse-spark` image now installs the
  `spark-3.4.4-bin-hadoop3-scala2.13` tarball to match the 2.13 executor (the default
  2.12 tarball fails at runtime with `NoSuchMethodError scala.util.matching.Regex.<init>`).

### Actor / HTTP stack (Akka/Spray → Pekko)
- Replaced the EOL Akka 2.4 + Spray stack with **Apache Pekko 1.1 / Pekko HTTP 1.1**
  across `commons`, the workflow executor, the RabbitMQ integration, and every backend
  service REST API.
- Ported the shared REST client to use an absolute request URI (required by Pekko
  `Http().singleRequest`).
- Upgraded RabbitMQ to **4.x** with a broker integration test.

### Python / PySpark / SparkR
- Moved the executor and notebook images to **Python 3.12**; generalized the PySpark
  bridge for Spark 3.4+.
- Restored the **SparkR / R executor** on Spark 3.4.4.
- Ported the workflow-examples SQL codegen to Python 3.

### Jupyter notebook stack
- Rebuilt the notebook image on **JupyterLab 4 / Notebook 7 / Python 3.12**, base
  `quay.io/jupyter/minimal-notebook:python-3.12`.
- Ported the custom forwarding/executing kernels to **ipykernel 6 / jupyter_client 8**
  and the contents manager / headless handler to **Jupyter Server 2**.
- Fixed the notebook chain end-to-end: `.ipynb` path so Notebook 7 renders (not raw
  JSON); `require_hash`/contents-model validation; forwarding-kernel "connecting"
  (Session digest history); `RabbitMQClient.consume` for the heartbeat handler;
  restart-kernel POST body as bytes; notebook display name
  `Analytical engine <sessionId> <notebookNumber>`.

### Editor / messaging reliability
- Moved the frontend MQ client off SockJS to a **raw WebSocket** (RabbitMQ 4.x) and
  re-enabled the STOMP heartbeat so the connection no longer drops at 60 s idle.
- Serialized `RabbitMQClient` publishes to fix AMQP frame corruption / reconnect churn
  (pika `BlockingConnection` is not thread-safe).

### Frontend
- Migrated the webpack **1 → 2** config so the `seahorse-frontend` image now **builds
  from source** on **Node 22 / npm 10** (previously shipped as a sed-patched prebuilt
  bundle). This bakes the editor/notebook runtime fixes into the source build.
- Fixed the container entrypoint (`run.sh` execute bit).

### Docker & build tooling
- Modernized the Docker build orchestration for **Spark 3.4.4 / JDK 17**; rebuilt the
  full image set and verified a complete `docker compose` bring-up.
- Repaired rotted deployment Dockerfiles (exim, h2, authorization).
- Ported the `build/` helper scripts and the `docker-compose` generator to **Python 3**.
- Gated the jclouds/Keystone modules out of the workflow manager's mocked-security mode.

## Upgrade notes
- **Full rebuild required.** All images move to the new stack; rebuild and redeploy
  the entire image set (`python3 ./build/manage-docker.py -b --all`).
- **Run on JDK 17.** Spark 3.0.0-on-JDK-11 is replaced by Spark 3.4.4-on-JDK-17;
  earlier JDKs are not supported.
- **External Spark clusters** must be Spark 3.4.4 built for **Scala 2.13**.
- `authorization` and `documentation` are consumed from the prebuilt
  `quay.io/deepsense_io/...:1.4.3` images (commented out of the `--all` build set).

## Files changed
Broad — spanning both sbt builds, the deployment Dockerfiles, `remote_notebook/`,
`frontend/`, and `build/`. See the commit range `v3.0.0.7..v3.0.0.8` and the
per-task deliverables tracked in [update.md](update.md).

---

# Seahorse Release 3.0.0.7

| | |
|---|---|
| **Tag** | `v3.0.0.7` |
| **Release date** | 2026-07-28 |
| **Previous tag** | `v3.0.0.6` |
| **Type** | Dependency additions |
| **Spark** | 3.0.0 (bin-hadoop2.7) on JDK 11 |

## Summary
Adds three Python packages to the `seahorse-spark` runtime image (installed into the conda Python 3.7 environment via [deployment/spark-docker/requirements.txt](deployment/spark-docker/requirements.txt)).

## Changes

### Added Python dependencies
| Package | Version | Purpose |
|---|---|---|
| `oracledb` | 2.3.0 | Oracle Database connectivity (thin-mode Python driver) |
| `PyHive` | 0.7.0 | Apache Hive access over Thrift |
| `lightgbm` | 3.3.5 | Gradient-boosting ML models |

## Upgrade notes
- **Rebuild required:** rebuild and redeploy the `seahorse-spark` image to pick up the new packages.
- `PyHive` connections may additionally require `thrift`, `sasl`, and `thrift-sasl` depending on the Hive auth mechanism — add them if needed.
- `lightgbm` requires OpenMP at runtime; if it fails to import, add `libgomp1` to the image's `apt-get install` list.

## Files changed
- [deployment/spark-docker/requirements.txt](deployment/spark-docker/requirements.txt) — added `oracledb==2.3.0`, `PyHive==0.7.0`, `lightgbm==3.3.5`.

---

# Seahorse Release 3.0.0.6

| | |
|---|---|
| **Tag** | `v3.0.0.6` |
| **Release date** | 2026-07-28 |
| **Previous tag** | `v3.0.0.5` |
| **Type** | Security remediation |
| **Spark** | 3.0.0 (bin-hadoop2.7) on JDK 11 |

## ⚠️ Critical Requirement: JDK 11
As with prior 3.0.0.x releases, this build runs **Spark 3.0.0 on JDK 11**. Ensure all nodes (Driver, Workers, Executors) run **Java 11**. Running on Java 8 is **not supported** (uses Java 9+ `--add-opens` flags).

## Summary
Removes the vulnerable **Log4j 1.x** libraries that stock Spark 3.0.0 bundles inside the deployment Spark Docker image, and replaces them with **Log4j 2.17.2** — aligning the Spark runtime container with the Log4j 2 stack already used by the JVM services.

## Changes

### Security — Log4j 1.x removed from the Spark runtime image
- **Affected image:** `seahorse-spark`, built from [deployment/spark-docker/Dockerfile](deployment/spark-docker/Dockerfile) with `SPARK_VERSION=3.0.0`, `HADOOP_VERSION=2.7`.
- **Root cause:** the image downloaded the stock `spark-3.0.0-bin-hadoop2.7` distribution, whose `jars/` directory ships `log4j-1.2.17.jar` and `slf4j-log4j12-1.7.16.jar`. The previously-present Log4j 2 upgrade step was commented out, so Log4j 1.x remained on the runtime classpath.
- **Fix (all folded into the existing Spark-install `RUN` — no new image layers):**
  - Delete `log4j-1.2*.jar` and `slf4j-log4j12-*.jar` from `$SPARK_HOME/jars/`.
  - Install Log4j 2 **2.17.2** — `log4j-api`, `log4j-core`, `log4j-slf4j-impl`, and the `log4j-1.2-api` bridge (which routes Spark's Log4j 1.x API calls onto the Log4j 2 backend).
  - Write a native `$SPARK_HOME/conf/log4j2.properties` mirroring Spark 3.0.0's default console logging, so log output is unchanged after the swap.

### CVEs addressed (Log4j 1.x)
- **CVE-2019-17571** — deserialization RCE in `SocketServer`
- **CVE-2021-4104** — `JMSAppender` RCE
- **CVE-2022-23302 / 23305 / 23307** — RCE / SQL-injection in bundled appenders

> Note: the JVM services (sessionmanager, workflowmanager, etc.) were already free of Log4j 1.x — the build excludes Spark's `log4j:log4j` and `slf4j-log4j12` transitively ([project/Dependencies.scala](project/Dependencies.scala)) and pins Log4j 2.17.2. This release closes the remaining gap in the Spark runtime container.

## Verification
After building `seahorse-spark`, the image should contain **no** Log4j 1.x jars:

```bash
docker run --rm --entrypoint sh seahorse-spark:<tag> -c \
  'ls $SPARK_HOME/jars | grep -E "log4j"'
# expected: log4j-api-2.17.2.jar, log4j-core-2.17.2.jar,
#           log4j-slf4j-impl-2.17.2.jar, log4j-1.2-api-2.17.2.jar
# expected absent: log4j-1.2.17.jar, slf4j-log4j12-*.jar
```

## Upgrade notes
- **Rebuild required:** the change is build-time only. Rebuild and redeploy the `seahorse-spark` image for the fix to take effect; already-running containers are unaffected until rebuilt.
- **External clusters:** if workflows are submitted to an external Spark 3.0.0 cluster, that cluster's own `jars/` directory still governs its classpath — apply the same Log4j 1.x removal there independently.
- No configuration or API changes; existing workflows run unchanged.

## Files changed
- [deployment/spark-docker/Dockerfile](deployment/spark-docker/Dockerfile) — Log4j 1.x removal, Log4j 2.17.2 install, `log4j2.properties` generation.

---

# Seahorse Release 3.0.0.3

| | |
|---|---|
| **Tag** | `3.0.0.3` |
| **Type** | Spark & Arrow compatibility |
| **Spark** | 3.0.0 (bin-hadoop2.7) on JDK 11 |

## ⚠️ Critical Requirement: JDK 11
This release is specifically configured to run **Spark 3.0.0 on JDK 11**.
Ensure that all nodes (Driver, Workers, and Executors) are running **Java 11**.
Running on Java 8 is **not supported** with this configuration due to the use of Java 9+ specific flags (`--add-opens`).

## Changes

### Spark & Arrow Compatibility Fixes
- **Java 11 Support**: Resolved invalid memory access errors (`sun.misc.Unsafe`, `java.nio.DirectByteBuffer`) by:
  - Adding comprehensive `--add-opens` JVM flags to expose internal JDK modules to Spark and Arrow.
  - Enabling `-Dio.netty.tryReflectionSetAccessible=true` to allow Netty to bypass safe access checks via reflection.
  - These flags are applied to both the **Spark Executors** and the **SessionManager/WorkflowExecutor** (Driver) processes.
- **Arrow Compatibility**:
  - Reverted the internal Arrow upgrade to strictly use **Arrow 0.15.1**, matching the version bundled with Spark 3.0.0.
  - Pinned `pyarrow==0.15.1` in the python environment.
  - Added `ARROW_PRE_0_15_IPC_FORMAT=1` to ensure PyArrow uses the legacy IPC format expected by Spark.
- **Stability**:
  - Fixed an issue where improper quoting in `spark-defaults.conf` caused Spark Executors to crash on startup in remote clusters.
