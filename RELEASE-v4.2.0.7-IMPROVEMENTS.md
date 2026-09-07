# 6D Analytical Engine — Release v4.2.0.7

**Comprehensive release document · improvements by image (with versions) + deployment**
Baseline: **v3.0.0.x** (legacy Seahorse 3.0.0) → Current: **v4.2.0.7** · Format: Markdown

---

## Summary

**6D Analytical Engine** is a visual, Spark-powered data-science and machine-learning workflow platform
(the modernized fork of deepsense.ai *Seahorse*). Users build workflows on a drag-and-drop canvas, run
them on Spark, explore results and reports, work in embedded Jupyter notebooks, and schedule recurring
runs with email reports.

Release **v4.2.0.7** is the culmination of a ground-up modernization of the **entire stack** — Spark
runtime, web UI, metadata database, all container base images, and the full security surface — delivered
across the v4.2.0.1 → v4.2.0.7 line. The legacy v3.0.0.x product ran an end-of-life stack (**Spark 3.0.0,
Scala 2.12, JDK 8, Python 3.7, AngularJS 1.8.3, H2 1.4.x**) carrying a large backlog of CRITICAL/HIGH
CVEs; v4.2.0.7 runs a **current, hardened, fully rebranded** stack with functional parity plus new
capabilities.

**Highlights of this release**

- **Runtime flip** — Apache **Spark 3.0.0 → 4.2.0**, **Scala 2.12 → 2.13.18**, **JDK 8 → 17**, and
  **Python 3.7 → 3.12** across the executor, managers, and notebook kernels (Jupyter Server 2 / Notebook 7).
- **Web UI rebuilt** — the EOL **AngularJS 1.8.3 UI was fully replaced by Angular 21** (0 AngularJS,
  `npm audit` **0 vulnerabilities**), plus a compact/modern UX pass across editor, home, modals and reports.
- **Dual metadata backend** — **H2 1.4.191 → 2.2.224** *and* new **MySQL 8** support, auto-selected from
  the JDBC URL, with per-vendor Flyway 9 migrations and readable `CHAR(36)` UUIDs on MySQL.
- **Security hardened** — **0 CRITICAL** container CVEs across all in-scope images; every OS base image
  modernized (Temurin 17, Alpine 3.20+, Node 22, nginx 1.31); Apache Derby removed and key JVM
  dependencies bumped.
- **New features & fixes** — branded HTML **scheduled-run and notebook emails** (execution details,
  workflow/node id in subject, **comma-separated recipients**), a report "view full report" link, and
  correctness fixes for the **One Hot Encoder** and **Evaluate** (Spark-4 vector) nodes.
- **Rebranded** — the product and all notifications now read **"Analytical Engine"**, and every image is
  published under the **`subinksoman/ae-*`** namespace.

**Release:** v4.2.0.7 · **12 built images** (+2 upstream) · **Docker Hub:** `docker.io/subinksoman/ae-<image>:4.2.0.7`
Most images ship at `4.2.0.7`; four carry post-release patch tags currently deployed: **ae-schedulingmanager `4.2.0.7.3`**, **ae-frontend `4.2.0.7.3`**, **ae-proxy `4.2.0.7.3`**, **ae-sessionmanager `4.2.0.7.1`**.

---

## 1. Improvements by image (main table)

| # | Image | What it is | Improvements delivered (v3.x → v4.2.0.7) |
|---|-------|------------|-------------------------------------------|
| 1 | **ae-spark** | Spark runtime base for the executor/session | • Spark **3.0.0 → 4.2.0**, Hadoop 2.7 → 3<br>• Scala **2.12 → 2.13.18**, **JDK 8 → 17**, **Python 3.7 → 3.12**<br>• Swapped vulnerable bundled jars (netty 4.2.16, jackson 2.18.8, gson, commons-io, json, slf4j-ext)<br>• **Removed Apache Derby**; suppressed shaded Hadoop/Parquet false positives<br>• Surgical `linux-libc-dev` removal so C/R toolchain survives; Python libs upgraded<br>• **Offline-first Spark install** — uses a local `spark-<ver>-bin-hadoop<h>.tgz` from the build context when present, else downloads |
| 2 | **ae-sessionmanager** | Session lifecycle + hosts the workflow executor (`we.jar`) | • Rebuilt executor on Spark 4.2.0 / Scala 2.13 / JDK 17<br>• **Fixed Evaluate node** "rawPrediction type other instead of vector" (Spark 4.x `VectorUDT`)<br>• **Fixed One Hot Encoder** node failure (no-arg constructor + guarded `copy()`)<br>• **Branded HTML notebook emails** (result + failure) with workflow/node id in subject<br>• **Comma-separated recipients**; sender brand "Analytical Engine"<br>• Jackson module aligned to databind 2.18.8<br>• **Fixed CSV write delimiter** (was the literal `Comma()` → real separator `,`)<br>• **Write to external-file datasources** (was rejected) *(4.2.0.7.1)* |
| 3 | **ae-workflowmanager** | Workflow storage + type inference API | • Temurin 17 / Scala 2.13 rebuild; JVM security bumps (Jetty 9.4.58, Jackson/json/gson/commons-io/slf4j)<br>• **H2 2.2.224 + MySQL 8** backend via Flyway 9 + URL vendor detection<br>• One Hot Encoder inference fix |
| 4 | **ae-schedulingmanager** | Scheduled workflow runs (Quartz) | • Temurin 17 / Scala 2.13 rebuild; **H2 + MySQL** (per-vendor Quartz driver/prefix)<br>• **Startup timeout hardening** (bounded Slick executor, graceful DB errors)<br>• **Modern HTML scheduled-run email** with execution details (run id, workflow id, timings, duration, status) + View-report button<br>• **Comma-separated recipients**; brand "Analytical Engine"<br>• **Run-now API** `POST /workflow/{id}/run` — execute a workflow once, on demand, returns `{status, runId}` *(4.2.0.7.1)*<br>• **Run-status API** `GET /runs/{runId}/status` → `RUNNING`/`FINISHED`/`FAILED` with failure detection + error reason *(4.2.0.7.2/.3)* |
| 5 | **ae-datasourcemanager** | Datasource registry API | • Temurin 17 / Scala 2.13 rebuild; JVM security bumps<br>• **H2 + MySQL** with readable **CHAR(36) UUIDs** on MySQL<br>• Ported example datasource seeds |
| 6 | **ae-libraryservice** | File library API | • Temurin 17 / Scala 2.13 rebuild; JVM security bumps<br>• Fixed library **upload/select** regressions (FileList flattening, kebab-case bindings) |
| 7 | **ae-frontend** | Web UI (editor, home, reports) | • **AngularJS 1.8.3 → Angular 21** — pure Angular, **0 AngularJS, npm audit 0 vulns**<br>• Router, all modals (CDK), change-detection tick, prod mode<br>• Base `nginx:1.10 → 1.31.3-alpine` (near-0 OS CVE)<br>• **Compact/modern UX** pass (spacing, header/toolbar, modals, logo, report table)<br>• Fixed string-param input null/stale on reload; **comma-separated** schedule emails; "view full report" link |
| 8 | **ae-proxy** | API gateway / reverse proxy | • Base **Node 6 → Node 22-alpine**<br>• **All vulnerabilities cleared** (npm audit 0, Trivy 0) |
| 9 | **ae-notebooks** | Jupyter kernel gateway | • **Python 3.12** + **Jupyter Server 2 / Notebook 7 / nbconvert**<br>• Upgraded tornado/urllib3/cryptography/pyjwt/mako/mistune/brotli/soupsieve<br>• Contents model always returns `hash`/`hash_algorithm` |
| 10 | **ae-rabbitmq** | Message broker (browser↔executor) | • RabbitMQ with **web-stomp**; image refreshed + re-tagged for the release |
| 11 | **ae-mail** | Outbound SMTP relay | • Rotted base **`alpine:3.4` (EOL) → `alpine:3.20`**<br>• Relays scheduled-run + notebook emails |
| 12 | **ae-h2** | Embedded database | • Base **`alpine-java:jre8` → `eclipse-temurin:17-jre-alpine`** (0 OS CVE)<br>• App-level **H2 1.4.191 → 2.2.224** (CVE fix) + Flyway 9 |
| 13 | *authorization* | Auth/UAA *(3rd-party, unchanged)* | • Not modernized — blocked on an EOL Ruby/UAA base rebase |
| 14 | *documentation* | Docs site *(3rd-party, unchanged)* | • Out of scope for this release |

---

## 2. Image versions & Docker Hub references

Most built images ship at **`4.2.0.7`**. Four carry post-release patch tags (the versions currently in the deployment compose) — shown in **bold** below.

| # | Image | Docker Hub image:tag | Base image |
|---|-------|----------------------|------------|
| 1 | ae-spark | `subinksoman/ae-spark:4.2.0.7` | miniconda (Py 3.12) + Temurin 17 + Spark 4.2.0 |
| 2 | ae-sessionmanager | **`subinksoman/ae-sessionmanager:4.2.0.7.1`** | `FROM ae-spark` (+ `we.jar`) |
| 3 | ae-workflowmanager | `subinksoman/ae-workflowmanager:4.2.0.7` | `eclipse-temurin:17-jre-alpine` |
| 4 | ae-schedulingmanager | **`subinksoman/ae-schedulingmanager:4.2.0.7.3`** | `eclipse-temurin:17-jre-alpine` |
| 5 | ae-datasourcemanager | `subinksoman/ae-datasourcemanager:4.2.0.7` | `eclipse-temurin:17-jre-alpine` |
| 6 | ae-libraryservice | `subinksoman/ae-libraryservice:4.2.0.7` | `eclipse-temurin:17-jre-alpine` |
| 7 | ae-frontend | **`subinksoman/ae-frontend:4.2.0.7.3`** | `nginx:1.31.3-alpine` |
| 8 | ae-proxy | **`subinksoman/ae-proxy:4.2.0.7.3`** | `node:22-alpine` |
| 9 | ae-notebooks | `subinksoman/ae-notebooks:4.2.0.7` | miniconda (Py 3.12) + Jupyter Server 2 |
| 10 | ae-rabbitmq | `subinksoman/ae-rabbitmq:4.2.0.7` | RabbitMQ + web-stomp |
| 11 | ae-mail | `subinksoman/ae-mail:4.2.0.7` | exim `alpine:3.20` |
| 12 | ae-h2 | `subinksoman/ae-h2:4.2.0.7` | `eclipse-temurin:17-jre-alpine` |
| 13 | authorization | `quay.io/deepsense_io/seahorse-authorization:1.4.3` | (unchanged, 3rd-party) |
| 14 | documentation | `quay.io/deepsense_io/seahorse-documentation:1.4.3` | (unchanged, 3rd-party) |

---

## 3. Platform-wide upgrades (apply across all built images)

| Component | v3.0.0.x | v4.2.0.7 |
|---|---|---|
| Apache Spark | 3.0.0 | **4.2.0** |
| Scala | 2.12 | **2.13.18** |
| JDK | 8 / 11 | **17** |
| Python | 3.7 | **3.12** |
| Jupyter | legacy | **Server 2 / Notebook 7** |
| Web framework | AngularJS 1.8.3 (EOL) | **Angular 21** |
| Metadata DB | H2 1.4.191 | **H2 2.2.224 + MySQL 8** |
| DB migrations | ad-hoc | **Flyway 9.22.3** (per-vendor) |
| Key JVM deps | old | Jetty 9.4.58, Jackson 2.18.8, Netty 4.2.16, snakeyaml 2.3, gson 2.10.1, commons-io 2.16.1, okhttp 4.12.0 (Derby removed) |

---

## 4. Docker Compose deployment

The deployment compose, using the published `subinksoman/ae-*:4.2.0.7` images.

> ⚠️ **Security note:** this file contains live credentials (RabbitMQ, workflow-manager auth, mail relay,
> personal emails). **Do not commit it to a public repository or share it externally** — rotate/replace
> the secrets first. H2 is the active backend; uncomment the MySQL `JDBC_URL`/`JDBC_USER`/`JDBC_PASSWORD`
> (and, for the scheduler, the `QUARTZ_*`) lines to switch a manager to MySQL.

```yaml
networks:
  default:
    ipam:
      config:
        - gateway: 192.168.0.1
          subnet: 192.168.0.0/24
      driver: default
services:
  authorization:
    depends_on:
      - database
    environment:
      LOG_LEVEL: ${LOG_LEVEL:-INFO}
      ENABLE_AUTHORIZATION: 'false'
      Analytical_Engine_ADMIN_EMAIL: joicejacob1910@gmail.com
      JDBC_URL: jdbc:h2:tcp://database:1521/uaa;CASE_INSENSITIVE_IDENTIFIERS=TRUE;DB_CLOSE_DELAY=-1
      SEAHORSE_ADMIN_EMAIL: seahorse-admin@deepsense.ai
      MAIL_SERVER_HOST: mail
      MAIL_SERVER_PORT: '25'
      MAIL_FROM: <your-smtp-user>
      UAA_CONFIG_YAML: |
        smtp:
          host: mail
          port: 25
          # If your relay requires auth to accept from UAA, add user/password here.
          # user: ""
          # password: ""
        login:
          self_service_links_enabled: true
    image: quay.io/deepsense_io/seahorse-authorization:1.4.3
    links:
      - database
    networks:
      default:
        ipv4_address: 192.168.0.10
    ports: []
    restart: always
  database:
    image: subinksoman/ae-h2:4.2.0.7
    networks:
      default:
        ipv4_address: 192.168.0.13
    restart: always
    volumes:
      - ./h2-data:/opt/h2-data:rw
  datasourcemanager:
    depends_on:
      - database
    environment:
      LOG_LEVEL: ${LOG_LEVEL:-INFO}
      # --- H2 backend (active) ---
      JDBC_URL: jdbc:h2:tcp://database:1521/datasourcemanager;CASE_INSENSITIVE_IDENTIFIERS=TRUE;DB_CLOSE_DELAY=-1
      # --- MySQL backend (commented out) ---
      # JDBC_URL: "jdbc:mysql://192.168.1.42:3306/datasourcemanager?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC"
      # JDBC_USER: <your-mysql-user>
      # JDBC_PASSWORD: "<your-mysql-password>"
    image: subinksoman/ae-datasourcemanager:4.2.0.7
    links:
      - database
    networks:
      default:
        ipv4_address: 192.168.0.14
    ports: []
    restart: always
  documentation:
    image: quay.io/deepsense_io/seahorse-documentation:1.4.3
    networks:
      default:
        ipv4_address: 192.168.0.5
    ports: []
    restart: always
  frontend:
    depends_on:
      - documentation
      - workflowmanager
      - sessionmanager
      - library
      - notebooks
      - rabbitmq
    environment:
      LOG_LEVEL: ${LOG_LEVEL:-INFO}
      ENABLE_AUTHORIZATION: 'true'
      API_VERSION: 4.2.0.7
      MQ_PASS: 1ElYfGNW
      MQ_USER: yNNp7VJS
      PORT: 80
      SESSION_POLLING_INTERVAL: 1000
    image: subinksoman/ae-frontend:4.2.0.7.3
    links:
      - documentation
      - workflowmanager
      - library
      - notebooks
      - rabbitmq
    networks:
      default:
        ipv4_address: 192.168.0.7
    ports: []
    restart: always
  library:
    image: subinksoman/ae-libraryservice:4.2.0.7
    networks:
      default:
        ipv4_address: 192.168.0.8
    ports: []
    restart: always
    volumes:
      - /library:/library
  mail:
    image: subinksoman/ae-mail:4.2.0.7
    networks:
      default:
        ipv4_address: 192.168.0.4
    ports: []
    environment:
      - LOG_LEVEL=${LOG_LEVEL:-INFO}
      - SMARTHOST_ADDRESS=smtp.gmail.com
      - SMARTHOST_PORT=25
      - SMARTHOST_USER=<your-smtp-user>
      - SMARTHOST_PASSWORD=<your-smtp-app-password>
      - SMARTHOST_ALIASES=*.gmail.com
      - RELAY_NETWORKS=:192.168.0.0/24:192.168.0.1/32
      - MAILNAME=seahorse.local
    restart: always
  notebooks:
    depends_on:
      - rabbitmq
      - workflowmanager
    environment:
      LOG_LEVEL: ${LOG_LEVEL:-INFO}
      HEARTBEAT_INTERVAL: 2.0
      JUPYTER_LISTENING_IP: 0.0.0.0
      JUPYTER_LISTENING_PORT: 8888
      MISSED_HEARTBEAT_LIMIT: 30
      MQ_HOST: rabbitmq
      MQ_PASS: 1ElYfGNW
      MQ_PORT: 5672
      MQ_USER: yNNp7VJS
      WM_AUTH_PASS: 8Ep9GqRr
      WM_AUTH_USER: oJkTZ8BV
      WM_URL: http://workflowmanager:60103
    image: subinksoman/ae-notebooks:4.2.0.7
    links:
      - rabbitmq
      - workflowmanager
    networks:
      default:
        ipv4_address: 192.168.0.11
    ports: []
    restart: always
    volumes:
      - /library:/library
  proxy:
    depends_on:
      - workflowmanager
      - sessionmanager
      - datasourcemanager
      - schedulingmanager
      - library
      - notebooks
      - rabbitmq
      - frontend
      - authorization
      - documentation
    environment:
      LOG_LEVEL: ${LOG_LEVEL:-INFO}
      AUTHORIZATION_HOST: http://authorization:8080
      DATASOURCE_MANAGER_HOST: http://datasourcemanager:8080
      DOCUMENTATION_HOST: http://documentation:80
      ENABLE_AUTHORIZATION: 'custom'
      FORCE_HTTPS: 'false'
      FRONTEND_HOST: http://frontend:80
      JUPYTER_HOST: http://notebooks:8888
      LIBRARY_HOST: http://library:9083
      PORT: 9093
      RABBITMQ_HOST: http://rabbitmq:15674
      SCHEDULING_MANAGER_HOST: http://schedulingmanager:60110
      SESSION_MANAGER_HOST: http://192.168.1.42:9082
      WM_AUTH_PASS: 8Ep9GqRr
      WM_AUTH_USER: oJkTZ8BV
      WORKFLOW_MANAGER_HOST: http://workflowmanager:60103
      ALLOWED_DOMAINS: '*'
    image: subinksoman/ae-proxy:4.2.0.7.3
    links:
      - workflowmanager
      - datasourcemanager
      - schedulingmanager
      - library
      - notebooks
      - rabbitmq
      - frontend
      - authorization
      - documentation
    networks:
      default:
        ipv4_address: 192.168.0.6
    ports:
      - 192.168.1.42:9093:9093
    restart: always
    volumes:
      - ./certs:/opt/docker/certs
  rabbitmq:
    environment:
      LOG_LEVEL: ${LOG_LEVEL:-INFO}
      RABBITMQ_PASS: 1ElYfGNW
      RABBITMQ_USER: yNNp7VJS
    image: subinksoman/ae-rabbitmq:4.2.0.7
    networks:
      default:
        ipv4_address: 192.168.0.9
    ports: []
    restart: always
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
  schedulingmanager:
    depends_on:
      - database
      - sessionmanager
      - workflowmanager
      - mail
    environment:
      LOG_LEVEL: ${LOG_LEVEL:-INFO}
      # --- H2 backend (active) ---
      JDBC_URL: jdbc:h2:tcp://database:1521/schedulingmanager;CASE_INSENSITIVE_IDENTIFIERS=TRUE;DB_CLOSE_DELAY=-1
      # --- MySQL backend (commented out) ---
      # JDBC_URL: "jdbc:mysql://192.168.1.42:3306/schedulingmanager?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC"
      # JDBC_USER: <your-mysql-user>
      # JDBC_PASSWORD: "<your-mysql-password>"
      # QUARTZ_DRIVER: com.mysql.cj.jdbc.Driver
      # QUARTZ_TABLE_PREFIX: schedulingmanager_quartz.QRTZ_
      # QUARTZ_DELEGATE: org.quartz.impl.jdbcjobstore.StdJDBCDelegate
      MAIL_SERVER_HOST: mail
      MAIL_SERVER_PORT: 25
      PORT: 60110
      SEAHORSE_EXTERNAL_URL: http://192.168.1.42:9093/
      SM_URL: http://192.168.1.42:9082
      WM_AUTH_PASS: 8Ep9GqRr
      WM_AUTH_USER: oJkTZ8BV
      WM_URL: http://workflowmanager:60103
    image: subinksoman/ae-schedulingmanager:4.2.0.7.3
    links:
      - database
      - workflowmanager
      - mail
    networks:
      default:
        ipv4_address: 192.168.0.3
    ports: []
    restart: always
  sessionmanager:
    depends_on:
      - rabbitmq
      - workflowmanager
      - library
      - database
    environment:
      LOG_LEVEL: ${LOG_LEVEL:-INFO}
      JDK_JAVA_OPTIONS: "--add-opens=java.base/java.lang=ALL-UNNAMED --add-opens=java.base/java.lang.invoke=ALL-UNNAMED --add-opens=java.base/java.lang.reflect=ALL-UNNAMED --add-opens=java.base/java.io=ALL-UNNAMED --add-opens=java.base/java.net=ALL-UNNAMED --add-opens=java.base/java.nio=ALL-UNNAMED --add-opens=java.base/java.util=ALL-UNNAMED --add-opens=java.base/java.util.concurrent=ALL-UNNAMED --add-opens=java.base/java.util.concurrent.atomic=ALL-UNNAMED --add-opens=java.base/sun.nio.ch=ALL-UNNAMED --add-opens=java.base/sun.nio.cs=ALL-UNNAMED --add-opens=java.base/sun.security.action=ALL-UNNAMED --add-opens=java.base/sun.security.ssl=ALL-UNNAMED --add-opens=java.base/sun.util.calendar=ALL-UNNAMED --add-opens=java.security.jgss/sun.security.krb5=ALL-UNNAMED -Dio.netty.tryReflectionSetAccessible=true"
      DATASOURCE_SERVER_ADDRESS: http://192.168.0.14:8080/datasourcemanager/v1/
      # --- H2 backend (active) ---
      JDBC_URL: jdbc:h2:tcp://192.168.0.13:1521/sessionmanager;CASE_INSENSITIVE_IDENTIFIERS=TRUE;DB_CLOSE_DELAY=-1
      # --- MySQL backend (commented out) ---
      # JDBC_URL: "jdbc:mysql://192.168.1.42:3306/sessionmanager?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC"
      # JDBC_USER: <your-mysql-user>
      # JDBC_PASSWORD: "<your-mysql-password>"
      MAIL_SERVER_HOST: 192.168.0.4
      MAIL_SERVER_PORT: 25
      NOTEBOOKS_SENDER_EMAIL: "Analytical Engine <alerts@6dtech.co.in>"
      MQ_HOST: 192.168.0.9
      MQ_PASS: 1ElYfGNW
      MQ_PORT: 5672
      MQ_USER: yNNp7VJS
      NOTEBOOK_SERVER_ADDRESS: http://192.168.0.11:8888
      SM_HOST: 192.168.1.42
      SM_PORT: 9082
      SX_PARAM_PYTHON_DRIVER_BINARY: /opt/conda/bin/python
      SX_PARAM_PYTHON_EXECUTOR_BINARY: python
      SX_PARAM_SESSION_EXECUTOR_DEPS_PATH: /opt/docker/we-deps.zip
      SX_PARAM_SESSION_EXECUTOR_PATH: /opt/docker/we.jar
      SX_PARAM_SPARK_APPLICATIONS_LOGS_DIR: /spark_applications_logs
      SX_PARAM_SPARK_RESOURCES_JARS: /resources/jars
      SX_PARAM_TEMP_DIR: /tmp/seahorse/download
      SX_PARAM_WM_ADDRESS: 192.168.0.12:60103
      SX_PARAM_WM_AUTH_PASS: 8Ep9GqRr
      SX_PARAM_WM_AUTH_USER: oJkTZ8BV
      HADOOP_CONF_DIR: /opt/seahorse_python3.7/seahorse/conf
    image: subinksoman/ae-sessionmanager:4.2.0.7.1
    network_mode: host
    ports: []
    restart: always
    volumes:
      - ./data:/resources/data
      - ./jars:/resources/jars
      - ./R_Libs:/opt/R_Libs
      - ./spark_applications_logs:/spark_applications_logs:rw
      - /library:/library
  workflowmanager:
    depends_on:
      - database
      - datasourcemanager
    environment:
      LOG_LEVEL: ${LOG_LEVEL:-INFO}
      DATASOURCE_SERVER_ADDRESS: http://datasourcemanager:8080/datasourcemanager/v1/
      # --- H2 backend (active) ---
      JDBC_URL: jdbc:h2:tcp://database:1521/workflowmanager;CASE_INSENSITIVE_IDENTIFIERS=TRUE;DB_CLOSE_DELAY=-1
      # --- MySQL backend (commented out) ---
      # JDBC_URL: "jdbc:mysql://192.168.1.42:3306/workflowmanager?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC"
      # JDBC_USER: <your-mysql-user>
      # JDBC_PASSWORD: "<your-mysql-password>"
      WM_AUTH_PASS: 8Ep9GqRr
      WM_AUTH_USER: oJkTZ8BV
      WM_HOST: 0.0.0.0
      WM_PORT: 60103
    image: subinksoman/ae-workflowmanager:4.2.0.7
    links:
      - database
      - datasourcemanager
    networks:
      default:
        ipv4_address: 192.168.0.12
    ports: []
    restart: always
    volumes:
      - ./jars:/resources/jars
volumes: {}
```

**Bring up:** `docker compose up -d` · **Editor:** `http://192.168.1.42:9093/`

---

## 5. New APIs — on-demand run & run status (scheduling manager)

Added in the v4.2.0.7 patch line (`ae-schedulingmanager` `4.2.0.7.1` → `4.2.0.7.3`). They let you run a
workflow once, immediately, and track its outcome by a **run id** — no cron schedule required.
Base path `/schedulingmanager/v1` (through the proxy on port `9093`); **no auth header required**.
Swagger spec: `http://<host>:9093/schedulingmanager/v1/swagger.json`.

### 5.1 Run a workflow now — `POST /schedulingmanager/v1/workflow/{workflowId}/run`

Request body:

```json
{ "emailForReports": "you@example.com", "presetId": 1 }
```

Response `200`:

```json
{ "status": "accepted", "runId": "932f871d-57f8-43ac-8cee-58497062aedf" }
```

Clones the workflow and runs it once on the given cluster preset, emailing an HTML report when done.
Fire-and-forget: the clone is awaited so `runId` (the cloned workflow id) returns immediately while
execution continues in the background. *(4.2.0.7.1)*

### 5.2 Check run status — `GET /schedulingmanager/v1/runs/{runId}/status`

Response `200`:

```json
{
  "runId": "932f871d-57f8-43ac-8cee-58497062aedf",
  "workflowId": "de22be8d-9098-408e-9474-f870468d6dda",
  "status": "FAILED",
  "startedAt": "2026-08-12T12:46:07.699Z",
  "finishedAt": "2026-08-12T12:46:29.363Z",
  "error": "2 node(s) failed or aborted"
}
```

- `status` — **`RUNNING`** | **`FINISHED`** | **`FAILED`**
- `error` — set on `FAILED` (node failures → `"N node(s) failed or aborted"`; infra errors → the exception message)
- `404` — the run id is unknown (never started, or the service restarted — status is held in memory)
- Works for on-demand **and** scheduled runs, and stays queryable **after** completion. (The session is
  deleted once a run ends, so `GET /v1/sessions/{id}/status` stops returning it — this endpoint does not.)
  *(status endpoint 4.2.0.7.2; `FAILED` detection 4.2.0.7.3)*

### 5.3 Example

```bash
# start a run
curl -X POST http://<host>:9093/schedulingmanager/v1/workflow/<workflowId>/run \
  -H 'Content-Type: application/json' \
  -d '{"emailForReports":"you@example.com","presetId":1}'

# poll status until FINISHED / FAILED (runId from the response above)
curl http://<host>:9093/schedulingmanager/v1/runs/<runId>/status
```

---

## 6. Security outcome

| Metric | Result |
|---|---|
| Container CRITICAL CVEs (in-scope images) | **0** |
| Frontend `npm audit` | **0 vulnerabilities** |
| OS base images | Modernized: Temurin 17, Alpine 3.20+, Node 22, nginx 1.31 |
| Accepted residual | Jetty HIGH (needs Scalatra 3 / Jetty 12 — Scala-2.13 milestone); `authorization` image (EOL Ruby base) |

---

## 7. Vulnerability scan report

- **Scanner:** Trivy (`aquasec/trivy:latest`), `--scanners vuln` — OS **and** language (JVM/Python/npm) packages
- **Scan date:** 2026-08-06 (report *r6*)
- **Scope:** the 11 built images + the `ae-spark` runtime. The two `quay.io` third-party images
  (authorization, documentation) are **excluded** — they are not built here and are remediable only upstream.

### 6.1 Per-image severity summary

| Image | OS base | Critical | High | Medium | Low | Total |
|-------|---------|--:|--:|--:|--:|--:|
| **frontend** | alpine 3.24.1 | 0 | 0 | 0 | 0 | 0 |
| **proxy** | alpine 3.24.1 | 0 | 0 | 0 | 0 | 0 |
| **h2** | alpine 3.23.5 | 0 | 0 | 0 | 0 | 0 |
| **mail** | alpine 3.20.10 | 0 | 0 | 0 | 0 | 0 |
| **notebooks** | ubuntu 24.04 | 0 | 0 | 26 | 42 | 68 |
| **rabbitmq** | ubuntu 24.04 | 0 | 0 | 32 | 10 | 42 |
| **datasourcemanager** | alpine 3.23.5 | 0 | 2 | 12 | 2 | 16 |
| **libraryservice** | alpine 3.23.5 | 0 | 2 | 12 | 2 | 16 |
| **schedulingmanager** | alpine 3.23.5 | 0 | 11 | 22 | 1 | 34 |
| **workflowmanager** | alpine 3.23.5 | 0 | 11 | 23 | 2 | 36 |
| **spark** | ubuntu 24.04 | 0 | 26 | 131 | 55 | 212 |
| **sessionmanager** | ubuntu 24.04 | 0 | 27 | 141 | 57 | 225 |
| **TOTAL** | | **0** | **79** | **399** | **171** | **649** |

**Key outcome: 0 CRITICAL vulnerabilities across every in-scope image.** `frontend`, `proxy`, `h2`,
`mail`, `notebooks` and `rabbitmq` have **0 High** as well. OS bases are current (Alpine 3.23–3.24,
Ubuntu 24.04) with no OS-level Critical/High.

### 6.2 Remaining High-severity findings (consolidated)

The residual High findings are **not OS-level** — they are bundled JVM libraries, concentrated in the
Spark-based images (`spark`, `sessionmanager`) and the four Scalatra REST managers:

| Component | Representative CVEs | Fixed in | Status in v4.2.0.7 |
|---|---|---|---|
| **Eclipse Jetty** (`jetty-security`, `jetty-http`) | CVE-2026-10050, CVE-2026-2332 | Jetty 12.x | **True residual** — blocked on a Scalatra 3 / Jetty 12 migration (Scala-2.13 milestone-only) |
| **jackson-databind / jackson-core** | CVE-2026-54512, CVE-2026-54513, GHSA-r7wm-3cxj-wff9 | 2.18.8 / 2.21.4 | App-managed Jackson bumped to **2.18.8**; **shaded** copies inside Spark uber-jars remain |
| **Netty** (`netty-handler`, `netty-codec-http/http2`, `netty-resolver-dns`, `netty-codec-compression`) | CVE-2026-44249/45416/45674/47691/50010/55831/55833/56745/56819/59901 | 4.2.16 | App-managed Netty overridden to **4.2.16**; **shaded** Spark copies (4.2.13) remain |
| **JLine** (`jline-remote-telnet`) | CVE-2026-56740, CVE-2026-56741 | 4.2.1 | **Shaded** in Spark; telnet path not used/reachable |
| **Apache Thrift** (`libthrift`) | CVE-2026-43869 | 0.23.0 | **Shaded** in Spark (Hive metastore path); not exposed |

### 6.3 Notes & remediation

- The Spark/session High counts come almost entirely from **libraries shaded inside Apache Spark's own
  uber-jars** (Netty, Jackson, JLine, Thrift). Our `dependencyOverrides` fix the *managed* copies; the
  shaded copies ship inside Spark and are cleared only by a future Spark point release. Non-reachable
  ones are annotated in `.trivyignore.yaml`.
- The **only** finding that is genuinely in the request path is the **Jetty** pair — tracked for the
  Scalatra 3 / Jetty 12 upgrade.
- Medium/Low findings are overwhelmingly OS-package advisories with no fix available yet on the current
  Alpine/Ubuntu bases.
- **Full detail:** per-image CVE tables and raw Trivy JSON are in
  `security-reports/2026-08-05/` (`seahorse-vulnerability-report-2026-08-05-r6.md` + `json/`).

> *Note:* this scan reflects the image set at report time; the final v4.2.0.7 dependency overrides
> (Netty 4.2.16, Jackson 2.18.8, etc.) only **reduce** the managed-package counts further.

---

*6D Analytical Engine · Release v4.2.0.7 · images `subinksoman/ae-*:4.2.0.7`.*
