# Seahorse

Seahorse is a visual framework for creating Apache Spark data-processing workflows.
Users design pipelines in a browser-based editor; a cluster of backend services
compiles, schedules and executes them on Spark, and a Jupyter-based notebook lets
users interact with the resulting `DataFrame`s in Python, R or SQL.

This repository has been **modernized** from the original Spark 3.0.0 / Scala 2.12 /
JDK 8 baseline to a current runtime — see [Technology Stack](#technology-stack). The
default build targets **Spark 3.4.4**, and the whole **Spark 4.x line (up to 4.2.0)**
is supported and verified end-to-end (`SPARK_VERSION=4.2.0`) — see
[Spark version support](#spark-version-support). The modernization plan and task
tracker live in [update.md](update.md); per-task notes are in [migration/](migration/).

## Architecture

Seahorse is a multi-service application. A single **proxy** (nginx) is the only
externally exposed entry point; it fronts the Angular UI and reverse-proxies every
backend service and the notebook/message bus. Services talk to each other over an
internal Docker network and share an H2 database. Workflow execution is delegated to
short-lived **Spark executor** processes that the Session Manager launches via
`spark-submit`.

```mermaid
flowchart TB
    browser["Browser (UI + Notebook)"]

    subgraph edge["Externally reachable"]
        proxy["proxy — nginx :9093"]
    end

    subgraph services["Backend services (internal network)"]
        frontend["frontend (Angular UI)"]
        wm["workflowmanager"]
        sm["sessionmanager"]
        sched["schedulingmanager"]
        dsm["datasourcemanager"]
        lib["libraryservice"]
        auth["authorization (UAA)"]
        docs["documentation"]
        nb["notebooks (Jupyter)"]
        mq["rabbitmq (web-stomp / amqp)"]
        db["database (H2)"]
        mail["mail (exim)"]
    end

    subgraph exec["Workflow execution"]
        spark["Spark executor (spark-submit of we.jar)"]
    end

    browser --> proxy
    proxy --> frontend
    proxy --> wm
    proxy --> sm
    proxy --> sched
    proxy --> dsm
    proxy --> lib
    proxy --> auth
    proxy --> docs
    proxy --> nb
    proxy --> mq

    wm --> db
    sm --> db
    sched --> db
    dsm --> db
    lib --> db
    auth --> db

    sm -->|launches| spark
    spark <-->|messages| mq
    nb <-->|kernel forwarding| mq
    spark -.reads/writes.- db
```

### Components

| Service | Docker image | Internal port | Role |
|---|---|---|---|
| **proxy** | `seahorse-proxy` | 9093 | nginx gateway — the only externally exposed port; serves the UI and reverse-proxies all services |
| **frontend** | `seahorse-frontend` | 80 | Angular 1.5 single-page editor (built from source with webpack 2) |
| **workflowmanager** | `seahorse-workflowmanager` | 60103 | Stores/serves workflows and notebooks — `GET/POST /v1/workflows` |
| **sessionmanager** | `seahorse-sessionmanager` | 9082 | Manages execution sessions; launches Spark executors via `spark-submit` |
| **schedulingmanager** | `seahorse-schedulingmanager` | 60110 | Scheduled/recurring workflow runs |
| **datasourcemanager** | `seahorse-datasourcemanager` | 8080 | External data-source definitions (JDBC, files, …) |
| **libraryservice** | `seahorse-libraryservice` | 9083 | User file/library storage |
| **notebooks** | `seahorse-notebooks` | 8888 | Jupyter Server 2 / Notebook 7; PySpark & SparkR kernels forwarded to the executor |
| **rabbitmq** | `seahorse-rabbitmq` | 15674 / 5672 | Message bus (web-stomp for the editor, AMQP for executor↔notebook) |
| **database** | `seahorse-h2` | 1521 | Shared H2 database for the services |
| **authorization** | `seahorse-authorization` | 8080 | CloudFoundry UAA (optional; prebuilt image) |
| **documentation** | `seahorse-documentation` | 80 | Static docs (prebuilt image) |
| **mail** | `seahorse-mail` | 25 | exim SMTP (notifications) |
| *(executor)* | `seahorse-spark` | — | Base runtime for the Spark executor launched by the Session Manager (not a long-running service) |

### Two sbt builds

The backend is split into **two independent sbt builds**, each with its own
`project/Dependencies.scala` and Spark-version `match` blocks:

- **root build** — the backend services (`workflowmanager`, `sessionmanager`,
  `schedulingmanager`, `datasourcemanager`, `libraryservice`, `commons`, …).
- **`seahorse-workflow-executor/`** — the execution engine (`deeplang`, `api`,
  `workflowexecutor`, Spark compatibility shims `sparkutils<ver>`).

Any dependency or Spark-version change generally has to be made in **both** builds.

---

## Technology Stack

| Area | Version | Notes |
|---|---|---|
| Apache Spark | **3.4.4** (default) · **4.0.x–4.2.0** supported | Hadoop 3, **Scala 2.13** distribution; `SPARK_VERSION` selects the arm |
| Scala | **2.13.12** (3.4.4) / **2.13.18** (4.x) | migrated from 2.12 |
| JDK | **17** (LTS) | Spark 3.4/4.x `--add-opens` incl. `sun.security.ssl` |
| HTTP / actor stack | **Apache Pekko 1.1.x** (pekko-http 1.1.0) | replaced Akka/Spray |
| sbt | **1.8.2** | |
| Python (executor & notebook) | **3.12** | PySpark bridge + Jupyter kernels |
| Python data/ML stack | numpy **2.4** · pandas **2.3** · pyarrow **25** | on the 4.x arm (numpy `<2.5` — numba ceiling); 3.4.4 keeps numpy `<2` |
| Jupyter | **Server 2 / Notebook 7** | base image `quay.io/jupyter/minimal-notebook:python-3.12` |
| Frontend | Angular 1.5 + **webpack 2** on **Node 22 / npm 10** | built from source |
| Containers | Docker + Docker Compose v2 | |

### Spark version support

`SPARK_VERSION` selects the compatibility arm (via the `sparkutils<ver>` shim + feature
modules). Two arms are wired:

- **`3.4.4`** (default) — the shipped 3.0.0.x baseline; Scala 2.13.12 / Hadoop 3.3 / numpy `<2`.
- **`4.x`** (`4.0.0`–`4.2.0`) — Scala **2.13.18** / Hadoop 3.5 / numpy **2.4** (pandas 2.3, pyarrow 25).
  Uses the `spark-<ver>-bin-hadoop3` distribution (no `-scala2.13` suffix — 4.x is Scala‑2.13 only).

**Spark 4.2.0 is verified end-to-end:** both sbt builds compile (12/12 backend modules), the
deeplang suite passes under ANSI‑default (345 tests), PySpark (Arrow), SparkR and ML persistence
work in the runtime image, and a live `docker compose` stack executes a workflow session on a
Spark 4.2.0 executor. Build it with `SPARK_VERSION=4.2.0` (see [Building](#building)); roll back to
3.4.4 by omitting the variable. Details in `migration/T40–T46`.

> Note: on Spark 4.x, the `schedulingmanager`/`datasourcemanager` services carry a small build-time
> patch that rewrites their swagger‑generated code from json4s‑3 to json4s‑4 idioms (the external
> codegen plugin still emits json4s‑3); it's guarded so the 3.4.4 build is untouched.

---

## Prerequisites

To **build** the project you need:

- **JDK 17** — set `JAVA_HOME` to a JDK 17 install (e.g. `export JAVA_HOME=/usr/lib/jvm/java-17-openjdk`).
- **sbt 1.8.2** (or a launcher that honors `project/build.properties`).
- **Docker 20.10+** and the **Compose v2** plugin (`docker compose`).
- **Python 3** — the `build/` orchestration helpers run under `python3`.
- **Node 22 + npm 10** — only if you build the `seahorse-frontend` image from source.
- **Several GB free disk** — an sbt build pulls multiple GB into `~/.ivy2` /
  `~/.cache/coursier`, and the images (notably `seahorse-notebooks` ~1.5 GB,
  `seahorse-spark` / `seahorse-sessionmanager` several GB) are large.

> The active `SPARK_VERSION` selects the compatibility arm. It defaults to `3.4.4`
> in [build/manage-docker.py](build/manage-docker.py); the sbt builds accept
> `-DSPARK_VERSION=3.4.4`.

---

## Repository Layout

```
.
├── project/                     # root sbt build definition (Dependencies.scala, plugins)
├── workflowmanager/             # backend service
├── sessionmanager/              # backend service (launches Spark executors)
├── schedulingmanager/           # backend service
├── datasourcemanager/           # backend service
├── libraryservice/              # backend service
├── backendcommons/              # shared backend code
├── seahorse-workflow-executor/  # SECOND sbt build: deeplang, api, workflowexecutor, spark shims
├── remote_notebook/             # Jupyter notebook image (seahorse-notebooks)
├── frontend/                    # Angular UI (seahorse-frontend)
├── deployment/                  # Dockerfiles: spark, rabbitmq, h2, exim, docker-compose generator
├── proxy/                       # nginx gateway Dockerfile
├── build/                       # build orchestration (manage-docker.py, shell wrappers)
└── update.md                    # modernization plan & task tracker
```

---

## Building

### 1. Compile / test the Scala code

```bash
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk    # JDK 17

# root build (backend services)
sbt -DSPARK_VERSION=3.4.4 compile
sbt -DSPARK_VERSION=3.4.4 workflowmanager/test

# executor build
cd seahorse-workflow-executor
sbt -DSPARK_VERSION=3.4.4 compile
```

### 2. Build Docker images

All image builds go through [build/manage-docker.py](build/manage-docker.py), which
knows how to build each image the right way — a plain `docker build` for the
"simple" images (proxy, rabbitmq, h2, spark, notebooks, mail, frontend) and the
sbt-docker plugin (`<project>/docker`) for the JVM services. Built images are tagged
internally with the current **git HEAD sha**; the publish step (below) retags them
to `<repository>/<prefix>-<name>:<version>`.

**Build a single image** (`-i` / `--images`):

```bash
# one JVM service
python3 ./build/manage-docker.py -b -i seahorse-workflowmanager

# one simple image
python3 ./build/manage-docker.py -b -i seahorse-frontend
```

**Build several images** at once:

```bash
python3 ./build/manage-docker.py -b -i seahorse-workflowmanager seahorse-sessionmanager
```

**Build everything** (`--all`):

```bash
python3 ./build/manage-docker.py -b --all
```

**Build against a specific Spark version** — `SPARK_VERSION` selects the arm (the
build supports the whole Spark 4.x line as well as 3.4.4):

```bash
SPARK_VERSION=4.2.0 python3 ./build/manage-docker.py -b --all   # Spark 4.x
# default is 3.4.4 (the shipped 3.0.0.8 stack)
```

`--all` builds the images defined in `image_confs` in `manage-docker.py`. By
default that is the 12 locally-built images:

```
seahorse-proxy            seahorse-rabbitmq        seahorse-h2
seahorse-spark            seahorse-schedulingmanager  seahorse-sessionmanager
seahorse-workflowmanager  seahorse-datasourcemanager  seahorse-libraryservice
seahorse-notebooks        seahorse-mail            seahorse-frontend
```

`seahorse-authorization` and `seahorse-documentation` are commented out of the
`--all` set and consumed from the prebuilt `quay.io/deepsense_io/...:1.4.3`
images; re-enable them in `manage-docker.py` to build from source.

**Tag & push to a registry** — `-t/--tag` retags the built images to
`<repository>/<prefix>-<name>:<version>`, and `--push` pushes them. All three
naming parts are variables (CLI flag or env var):

| Part | Flag | Env var | Default |
|---|---|---|---|
| repository / namespace | `-r`, `--repository` | `DOCKER_REPOSITORY` | `subinksoman` |
| image prefix | `-p`, `--prefix` | `IMAGE_PREFIX` | `seahorse` |
| version tag | `-v`, `--version` | `IMAGE_VERSION` | git HEAD commit id |

```bash
# build all, then tag + push with the defaults -> subinksoman/seahorse-<name>:<commit>
python3 ./build/manage-docker.py -b --all -t --push

# publish the ae-branded set at a release version -> subinksoman/ae-<name>:3.0.0.8
python3 ./build/manage-docker.py -b --all -t --push -p ae -v 3.0.0.8

# different org / prefix -> myorg/engine-<name>:4.2.0
python3 ./build/manage-docker.py -b --all -t --push -r myorg -p engine -v 4.2.0
```

(Requires `docker login` to the target registry for `--push`.)

> **sbt image tip:** the sbt-docker path batches all requested JVM services into a
> single `sbt clean ... <proj>/docker` invocation. If you hit a stale
> incremental-compile error (`NoClassDefFoundError: Dependencies$`), clear the
> meta-build targets first:
> `rm -rf project/target seahorse-workflow-executor/project/target`.

---

## Deploying / Running the stack

The runnable `docker-compose.yml` is **generated** (image tags pinned to a git sha)
by [deployment/docker-compose/docker-compose.py](deployment/docker-compose/docker-compose.py):

```bash
# generate a compose file tagged with the current HEAD
GIT_SHA=$(git rev-parse HEAD)
python3 deployment/docker-compose/docker-compose.py \
  --generate-only --yaml-file docker-compose.yml -b "$GIT_SHA" -f "$GIT_SHA"

# bring the stack up
docker compose up -d

# check status / logs
docker compose ps -a
docker compose logs -f workflowmanager
```

Once up, Seahorse is reachable through the **proxy** (default port **9093**) — e.g.
`http://<host>:9093/`. The proxy serves the editor UI and routes `/v1/...` API calls,
the notebook, and the message bus.

To tear it down:

```bash
docker compose down
```

---

## Notes

- **Spark distribution must be Scala 2.13.** On **3.4.x** the default
  `spark-*-bin-hadoop3.tgz` is Scala 2.12 and fails at runtime against the 2.13 executor
  (`NoSuchMethodError scala.util.matching.Regex.<init>`), so the image uses the
  `...-scala2.13` tarball. On **4.x** there is no 2.12 build — the plain
  `spark-<ver>-bin-hadoop3.tgz` is already Scala 2.13 (no suffix). `seahorse-spark` picks the
  right one per version.
- **JDK 17 module access.** The services/executor run with Spark 3.4/4.x's `--add-opens`
  set plus `--add-opens=java.base/sun.security.ssl=ALL-UNNAMED` (the executor uses an
  HTTPS client).
- **Build helper scripts are Python 3.** `build/*.py` and
  `deployment/docker-compose/docker-compose.py` target `python3`.

## Logging

Logging is standardized around a single **`LOG_LEVEL`** environment variable (`DEBUG` / `INFO` /
`WARN` / `ERROR`, default **`INFO`**) honored consistently across every component:

| Component | Mechanism | Level source |
|---|---|---|
| JVM services (workflowmanager, sessionmanager, …) | shared `log4j2.xml` (uniform pattern) | `ai.deepsense` logger = `${env:LOG_LEVEL:-INFO}`; root + third-party pinned `WARN` |
| PyExecutor (custom-code transforms) | `pyexecutor/simple_logging.py` | `LOG_LEVEL` env (default INFO); `log_debug/info/warn` → stdout, `log_error` → stderr |
| Notebook kernels | `remote_notebook/code/utils.py` | `LOG_LEVEL` env (default INFO) |
| Proxy | Node `reverse-proxy.js` | transient upstream `ECONNREFUSED` logged as one line, not a stack trace |

Raise verbosity without a rebuild by setting the env var, e.g.:

```bash
docker compose ... up -d   # then, to debug one service:
docker compose exec -e LOG_LEVEL=DEBUG workflowmanager ...   # or set LOG_LEVEL in the compose env
```

Notes:
- **Pekko** (the actor/HTTP stack) is pinned to `WARN` and dead-letter logging is disabled
  (`pekko.log-dead-letters = 0`), so transient actor churn — e.g. the RabbitMQ startup race — no
  longer spams the logs.
- The PyExecutor previously emitted ~50 raw `print("DEBUG: …", file=sys.stderr)` lines that the JVM
  caretaker logged **as ERROR**; these now go through the level-gated logger and are hidden at the
  default `INFO`.

## Release History

Full notes in [RELEASE.md](RELEASE.md); the task tracker is in [update.md](update.md).

| Release | Stack | Image tags |
|---|---|---|
| **4.2.0.2** (latest) | Spark **4.2.0** / Scala 2.13.18 / JDK 17 / Python 3.12 (numpy 2.4 · pandas 2.3 · pyarrow 25) | `subinksoman/ae-<svc>:4.2.0.2` |
| **4.2.0.1** | Spark **4.2.0** / Scala 2.13.18 / JDK 17 / Python 3.12 (numpy 2.4 · pandas 2.3 · pyarrow 25) | `subinksoman/ae-<svc>:4.2.0.1` |
| **3.0.0.8** | Spark **3.4.4** / Scala 2.13.12 / JDK 17 / Python 3.12 | `subinksoman/ae-<svc>:3.0.0.8` |

`4.2.0.2` is a patch over `4.2.0.1` — interactive-notebook reliability (RabbitMQ
`consumer_timeout`, kernel auto-reconnect on restart), readable per-node notebook
tab names, and suppression of the benign "DataFrame constructor is internal"
warning. Same Spark/Scala/JDK/Python stack.

Later tags `4.2.0.3` and `4.2.0.4` are **frontend/mail source patches** (git tags +
GitHub releases; the `seahorse-frontend`/`seahorse-mail` images are rebuilt, the rest are
unchanged from `4.2.0.2`) — see [RELEASE.md](RELEASE.md). `4.2.0.4` upgrades AngularJS to
1.8.3 and hardens the browser-shipped libraries (runtime `npm audit` **57 → 5, 0 critical**),
fixes the editor/report/schedule AngularJS-1.8 binding regressions, and repairs scheduled
report-email delivery (exim authenticated smarthost).

Modernization highlights:

- Spark 3.0.0 → **3.4.4** (default), and the full **Spark 4.x line up to 4.2.0** supported +
  verified end-to-end (see [Spark version support](#spark-version-support)).
- Scala 2.12 → **2.13** (2.13.12 on 3.4.4, 2.13.18 on 4.x), JDK 8 → **17**, Akka/Spray → **Pekko**.
- Python 3.7 → **3.12** (executor + PySpark); on the 4.x arm numpy **2.4** / pandas **2.3** /
  pyarrow **25**. Jupyter → **Server 2 / Notebook 7**.
- Frontend now **builds from source** (webpack 1 → 2, Node 22).
- Docker image set rebuilt on the modernized stack (3.4.4 and 4.2.0); full `docker compose`
  bring-up + live workflow execution verified on both.
