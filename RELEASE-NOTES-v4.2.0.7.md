# 6D Analytical Engine — Release Notes

**From v3.0.0.x (legacy Seahorse 3.0.0) → v4.2.0.7 (current)**
Image-wise release document · format: Markdown

> The product is the modernized fork of deepsense.ai **Seahorse**, rebranded **6D Analytical Engine**.
> This document summarizes everything that changed from the v3.0.0 baseline through the current
> **v4.2.0.7** release, organized **per Docker image**.

---

## 1. Overview

The v3.x line was the original Seahorse 3.0.0 stack: **Spark 3.0.0, Scala 2.12, JDK 8/11, Python 3.7,
AngularJS 1.8.3, H2 1.4.x**, with dozens of end-of-life base images and a large backlog of CRITICAL/HIGH
CVEs. The v4.2.0.x line is a ground-up modernization of the whole stack — runtime, frontend, database,
container base images, and security — while preserving the workflow/executor functionality.

**Headline changes (v3.x → v4.2.0.7):**

| Area | v3.0.0.x (before) | v4.2.0.7 (now) |
|---|---|---|
| Apache Spark | 3.0.0 | **4.2.0** |
| Scala | 2.12 | **2.13.18** |
| JDK | 8 / 11 | **17** |
| Python (executor + notebooks) | 3.7 | **3.12** |
| Jupyter | legacy notebook | **Jupyter Server 2 / Notebook 7** |
| Web UI framework | AngularJS 1.8.3 (EOL) | **Angular 21** (pure, 0 AngularJS) |
| Metadata store | H2 1.4.191 only | **H2 2.2.224 + MySQL 8** (URL-detected) |
| DB migrations | ad-hoc | **Flyway 9.22.3**, per-vendor |
| Email notifications | plain text | **branded HTML** (scheduled-run + notebook) |
| Container base images | mostly EOL | modernized (Temurin 17, Alpine 3.20+, Node 22, nginx 1.31) |
| `npm audit` (frontend) | angular HIGH + moderates | **0 vulnerabilities** |
| Container CRITICAL CVEs | many | **0 CRITICAL** across in-scope images |

---

## 2. Release timeline

| Tag | Date | Commit | Theme |
|---|---|---|---|
| v3.0.0.5 | 2026-02-04 | `4b471230d` | Legacy 3.0.0 baseline |
| v3.0.0.6 | 2026-07-28 | `d7b6bc084` | Baseline maintenance |
| v3.0.0.7 | 2026-07-28 | `a4c507852` | Baseline maintenance |
| v3.0.0.8 | 2026-07-30 | `6438aaa0f` | Last 3.x release |
| v4.2.0.1 | 2026-07-31 | `4f846fab3` | Spark 4.2.0 / Scala 2.13 / JDK 17 flip |
| v4.2.0.2 | 2026-07-31 | `1e76cb0e4` | Python 3.12 + Jupyter, executor rebuild |
| v4.2.0.3 | 2026-08-03 | `aec2be82d` | Editor canvas → Angular |
| v4.2.0.4 | 2026-08-03 | `d4ac8b137` | Node/param panel → Angular |
| v4.2.0.5 | 2026-08-03 | `98d9a9a67` | Report subsystem → Angular |
| v4.2.0.6 | 2026-08-05 | `03f6a2f83` | **AngularJS fully removed** (the flip); brand + Alpine image |
| **v4.2.0.7** | **2026-08-07** | **`212ee3655`** | **MySQL parity, Spark-4 fixes, branded emails, security sweep, frontend fixes** |

---

## 3. Platform-wide upgrades (the stack flip)

These changes cut across every JVM/Python/Spark image:

- **Spark 3.0.0 → 4.2.0** via versioned `sparkutils<ver>` shim modules; `SPARK_VERSION` selects the build
  arm (default is now `4.2.0`). Log4j 2 ships by default with Spark 4.2.0.
- **Scala 2.12 → 2.13.18** across all modules; JDK-17 `--add-opens` flags standardized.
- **JDK 8/11 → 17** everywhere (Temurin 17); full Spark-4 reflection `--add-opens` set applied to
  services and the Spark launchers.
- **Python 3.7 → 3.12** for the PySpark executor and notebook kernels; `requirements.txt` unpinned where
  cp312 wheels differ (e.g. reportlab).
- **Jupyter Server 2 / Notebook 7** and SparkR re-wired.
- Dependency modernization (bundled + managed): **Jetty 9.4.58**, **Jackson 2.18.8** (aligned
  databind + scala module), **Netty 4.2.16**, **snakeyaml 2.3**, **gson 2.10.1**, **commons-io 2.16.1**,
  **okhttp 4.12.0**, **aws-java-sdk-s3 1.12.782**, **retrofit 2.9.0**; **Apache Derby removed** (unused).

---

## 4. Image catalogue

**Docker Hub tag convention:** `docker.io/subinksoman/ae-<image>:4.2.0.7`

| Service | Image (Docker Hub) | Base image | Current build SHA |
|---|---|---|---|
| Spark base | `subinksoman/ae-spark` | miniconda (Py 3.12) + Temurin 17 + Spark 4.2.0 | build base |
| Session manager | `subinksoman/ae-sessionmanager` | `FROM ae-spark` (+ we.jar) | `72896f822` |
| Workflow manager | `subinksoman/ae-workflowmanager` | `eclipse-temurin:17-jre-alpine` | `f88e2a1ce` |
| Scheduling manager | `subinksoman/ae-schedulingmanager` | `eclipse-temurin:17-jre-alpine` | `72896f822` |
| Datasource manager | `subinksoman/ae-datasourcemanager` | `eclipse-temurin:17-jre-alpine` | `38ab4d799` |
| Library service | `subinksoman/ae-libraryservice` | `eclipse-temurin:17-jre-alpine` | `2b237b340` |
| Frontend (web UI) | `subinksoman/ae-frontend` | `nginx:1.31.3-alpine` | `d3acec3e6` |
| Proxy (gateway) | `subinksoman/ae-proxy` | `node:22-alpine` | `c676a3e8e` |
| Notebooks (Jupyter) | `subinksoman/ae-notebooks` | miniconda (Py 3.12) + Jupyter Server 2 | `a6ba9976b` |
| RabbitMQ | `subinksoman/ae-rabbitmq` | RabbitMQ + web-stomp | `0ae69f86a` |
| Mail relay | `subinksoman/ae-mail` | exim `alpine:3.20` | `1212f5e36` |
| Database (H2) | `subinksoman/ae-h2` | `eclipse-temurin:17-jre-alpine` | `a02f734fc` |
| Authorization *(3rd-party)* | `quay.io/deepsense_io/seahorse-authorization:1.4.3` | (unchanged) | — |
| Documentation *(3rd-party)* | `quay.io/deepsense_io/seahorse-documentation:1.4.3` | (unchanged) | — |

> *Authorization* and *Documentation* remain the upstream deepsense.ai images and are out of scope for
> the modernization/security work (authorization is blocked on an EOL Ruby/UAA base rebase).

---

## 5. Image-by-image changes

### 5.1 `ae-spark` — Spark runtime base
The foundation image for the executor/session runtime.
- Spark **3.0.0 → 4.2.0**, Hadoop 2.7 → 3, Scala 2.13.18, **JDK 17**, **Python 3.12** (miniconda).
- Security: swapped vulnerable bundled jars (**netty 4.2.16, jackson 2.18.8**, gson, commons-io, json,
  slf4j-ext), **removed Apache Derby**, suppressed shaded Hadoop/Parquet false positives.
- Build hygiene: **surgical `linux-libc-dev` removal** (`dpkg --remove --force-depends`) so the C/R build
  toolchain survives; Python libs upgraded via `pip -U`.

### 5.2 `ae-sessionmanager` — session + workflow executor host
`FROM ae-spark`; bundles the executor fat-jar at `/opt/docker/we.jar`.
- Rebuilt executor (`we.jar`) on the Spark 4.2.0 / Scala 2.13 / JDK 17 stack.
- **Spark 4.x vector fix:** Evaluate node reported `Column 'rawPrediction' has type 'other' instead of
  vector` — the executor now recognizes Spark 4.x `ml.linalg.VectorUDT` columns.
- **One Hot Encoder fix:** `SingleColumnOneHotEncoder` failed with `NoArgumentConstructorRequired` +
  a `copy()` `NoSuchElement`; added a parameterless constructor and guarded `copy()`.
- **Branded HTML notebook emails** (result + failure) with the workflow/node id in the subject and
  comma-separated recipient support; sender display name is **"Analytical Engine"**
  (`NOTEBOOKS_SENDER_EMAIL`).
- Jackson module aligned to databind 2.18.8 (was 2.15.2).

### 5.3 `ae-workflowmanager` — workflow storage/inference API
- Temurin 17 / Scala 2.13 rebuild; Jetty 9.4.58 + Jackson/json/gson/commons-io/slf4j security overrides.
- **MySQL + H2 2.2.224** metadata store via Flyway 9 and URL-based vendor detection (per-vendor
  migrations). Inference-side One Hot Encoder fix also applies here.

### 5.4 `ae-schedulingmanager` — scheduled workflow runs (Quartz)
- Temurin 17 / Scala 2.13 rebuild; **MySQL + H2** support (Quartz table prefix/driver switch per vendor).
- **Startup timeout hardening:** bounded Slick `AsyncExecutor` + graceful DB error propagation.
- **Modern HTML scheduled-run email** with an execution-details table (workflow name, workflow id,
  run id, cluster preset, start/finish times, duration, status) and a "View report" button;
  **comma-separated recipients**; brand text **"Analytical Engine"**.

### 5.5 `ae-datasourcemanager` — datasource registry API
- Temurin 17 / Scala 2.13 rebuild; JVM dependency security bumps.
- **MySQL + H2** support with readable **CHAR(36) UUIDs** on MySQL and ported example datasource seeds.

### 5.6 `ae-libraryservice` — file library API
- Temurin 17 / Scala 2.13 rebuild; JVM dependency security bumps.
- Library file **upload/select** bugs fixed during the Angular migration (FileList flattening,
  kebab-case downgrade bindings).

### 5.7 `ae-frontend` — web UI
- **AngularJS 1.8.3 → Angular 21** (complete rewrite/migration; **0 AngularJS**, `npm audit` **0 vulns**).
  ui-router → @angular/router; `$uibModal` → `@angular/cdk` dialogs; native `$rootScope` emulator with a
  60 ms `detectChanges` tick driving change detection; `enableProdMode()`.
- Base image `nginx:1.10` → **`nginx:1.31.3-alpine`** (near-zero OS CVEs); Bootstrap vendored.
- **UX pass:** compact/modern spacing, shorter header/toolbars, denser modals, logo alignment,
  node-label truncation, notebook modal footer, compact execution-report table.
- **Fixes:** string-param inputs now bind to the live model value (fixes null/blank field on reload);
  schedule email field accepts **comma-separated recipients**; report **"For more, view full report"**
  link.

### 5.8 `ae-proxy` — API gateway
- Base image **Node 6 → Node 22-alpine**; all vulnerabilities cleared (**npm audit 0, Trivy 0**).
- Routes the frontend, managers, notebooks, RabbitMQ web-stomp, authorization, and documentation.

### 5.9 `ae-notebooks` — Jupyter kernel gateway
- **Python 3.12** + **Jupyter Server 2 / Notebook 7 / nbconvert**; `tornado/urllib3/cryptography/pyjwt/
  mako/mistune/brotli/soupsieve` upgraded; contents model always returns `hash`/`hash_algorithm`.

### 5.10 `ae-rabbitmq` — message broker
- RabbitMQ with **web-stomp** for the browser↔executor channel; image refreshed and re-tagged for the
  release (no functional API change).

### 5.11 `ae-mail` — SMTP relay
- Rotted base **`alpine:3.4` (EOL edge repos) → `alpine:3.20`**; used as the outbound relay/smarthost
  for scheduled-run and notebook emails.

### 5.12 `ae-h2` — embedded database
- Base **`anapsix/alpine-java:jre8` → `eclipse-temurin:17-jre-alpine`** (0 OS CVE).
- Application-level **H2 1.4.191 → 2.2.224** (CVE fix) with Flyway 9; the running deployment can point
  each manager at either H2 (`jdbc:h2:tcp://…`) or MySQL via `JDBC_URL`.

---

## 6. Security posture

- **0 CRITICAL** container CVEs across all in-scope images (Trivy).
- Frontend **`npm audit`: 0 vulnerabilities** (AngularJS/angular-sanitize/ui-router/bootstrap all cleared).
- JVM: Jetty 9.4.58, Jackson 2.18.8, Netty 4.2.16, snakeyaml 2.3, gson 2.10.1, json 20240303,
  commons-io 2.16.1, okhttp 4.12.0; **Derby removed**.
- OS base images modernized (Temurin 17, Alpine 3.20+, Node 22, nginx 1.31); kernel headers purged from
  build images.
- Shaded uber-jar false positives suppressed via path-scoped `.trivyignore.yaml`.
- **Residual / accepted:** a Jetty HIGH remains until a Scalatra 3 / Jetty 12 migration (milestone-only on
  Scala 2.13); the third-party **authorization** image is blocked on an EOL Ruby/UAA base rebase.

---

## 7. Data & backend (H2 2.x + MySQL)

- **Dual backend:** every manager auto-detects H2 vs MySQL from its `JDBC_URL` prefix (`JdbcVendor`).
- **MySQL:** custom `MySQLStringUuidProfile` maps UUID → `CHAR(36)` for **human-readable id/workflow-id/
  node-id columns**; per-vendor Flyway migrations under `db/migration/{h2,mysql}/<manager>`; example
  workflows + datasources seeded (case-sensitive table names + `NO_BACKSLASH_ESCAPES` handled).
- Switch backends by toggling the commented `JDBC_URL` blocks in `seahorse-deploy/docker-compose.yml`
  (H2 is the current default; MySQL requires the DB to be reachable).

---

## 8. Deployment notes

- Compose file: `seahorse-deploy/docker-compose.yml` (local, not committed). Images referenced by git-SHA
  tag; the release is also published to Docker Hub as `subinksoman/ae-<image>:4.2.0.7`.
- Editor URL: `http://<host>:9093/` (proxy on port 9093).
- Emails require the `ae-mail` relay reachable and `MAIL_SERVER_HOST`/`NOTEBOOKS_SENDER_EMAIL` set.
- Git: branch `feature/frontend-security-upgrade`, tag **`v4.2.0.7`** on both GitHub remotes.

---

## 9. Known issues / open items

- **Run status can stick on "running"** and **"Start editing" can appear disabled on a clone** — under
  investigation; tied to workflow **ownership** (frontend user id vs backend-stamped `ownerId`) and the
  async status/WebSocket path after clone/navigation. UI change-detection itself is healthy.
- **Jetty HIGH** residual (needs Scalatra 3 / Jetty 12; Scala-2.13 milestone-only).
- **authorization** & **documentation** images remain upstream/third-party (not modernized).

---

*Generated for the v4.2.0.7 release · 6D Analytical Engine.*
