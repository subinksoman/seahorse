# T90 — Upgrade H2 from 1.4.x to latest (2.4.240)

**Status:** `deferred` — **decision 2026-08-05: keep H2 at 1.4.192 as-is (accepted risk).** Assessment
complete; not implemented. Revisit if the H2 server ever becomes network-reachable outside the internal
Docker network, if the `-web` Console is enabled, or if any JDBC URL becomes user-influenced.
**Type:** backend + deployment security upgrade
**Goal:** move H2 off the 1.4.x line (server image `1.4.192`, service JDBC driver `1.4.191`) to the
latest release **2.4.240**, clearing the two H2-jar criticals `CVE-2021-42392` + `CVE-2022-23221`
(fixed in H2 2.0.206 / 2.1.210).

## Decision (2026-08-05)
**Keep H2 1.4.192.** Rationale: the base image is already modernized (Alpine JRE 17, 0 OS CVEs), and
the two residual H2-jar criticals are **not remotely reachable** in this deployment — the server runs
`-tcp` only (no `-web` Console, the JNDI/RCE vector) and every JDBC URL is fixed in
`docker-compose.yml` (no attacker-controlled URL/`INIT`), with port 1521 confined to the internal
Docker network. The full 2.x upgrade is a coordinated server + all-service-driver + Slick + live-data
migration (see below) — disproportionate to the (mitigated) residual risk. This doc is retained as the
ready-to-execute plan should the deployment's exposure change.

> Context: the h2 image base was already modernized (Alpine JRE 17, 0 OS CVEs — see
> `deployment/h2-docker/README.md`). This task is the **jar** upgrade, which was deliberately deferred
> there because it is a breaking, backend-wide change rather than an image change.

## Assessment (proof-of-concept run 2026-08-05)

PoC used the vendored `h2-1.4.192.jar`, a freshly downloaded `h2-2.4.240.jar`, and a real
`workflowmanager.mv.db` copy + a representative synthetic DB.

| # | Question | Result |
|---|---|---|
| 1 | Can H2 2.4.240 open an existing 1.4.x `*.mv.db` file directly? | **NO** — `JdbcSQLNonTransientConnectionException: Unsupported database file version or invalid file header [90048-240]`. A plain jar swap corrupts/loses every database. |
| 2 | Can the backend's 1.4.191 JDBC client talk to a 2.4.240 TCP server? | **NO** — `Version mismatch, driver version is "15" but server version is "17" [90047-240]`. The services' driver must be upgraded in lock-step with the server. |
| 3 | Does the SCRIPT→RUNSCRIPT migration path work? | **YES** — `org.h2.tools.Script` (export, run with 1.4.x) → `org.h2.tools.RunScript` (import, run with 2.4.240) round-trips schema + data cleanly on the sample. |
| 4 | Slick compatibility | **Blocker.** `project/Dependencies.scala` pins `Version.slick = "3.3.3"`, which targets H2 1.4.x; H2 2.x support landed in **Slick 3.4.0**. The DB layer is Slick `H2Profile` (`workflowmanager/.../WorkflowDaoModule.scala`), so Slick must be bumped (>= 3.4.1, ideally 3.5.x) and re-verified. |
| 5 | H2 2.x SQL strictness | Must review — H2 2.x reserves more keywords (`VALUE`, `KEY`, `ROW`, …), changed some type/`IDENTITY`/`AUTO_INCREMENT` behaviors, and is stricter on casts. Any hand-written SQL / evolutions / column names must be audited. |

**Conclusion:** upgrading is feasible but is a coordinated **server + all service drivers + Slick +
data migration** change, not a one-line jar bump. Do NOT swap the jar in isolation.

## Scope / files

- `project/Dependencies.scala` — `Version.h2 "1.4.191" -> "2.4.240"`; `Version.slick "3.3.3" -> 3.4.x/3.5.x`.
- `deployment/h2-docker/` — vendor `h2-2.4.240.jar`, bump `ENV H2_VERSION`, update the `COPY`/`CMD`,
  update `README.md`. (Base already Alpine JRE 17.)
- Rebuild the 4 driver-bundling services (sbt, JDK 17): **workflowmanager, sessionmanager,
  datasourcemanager, schedulingmanager** (+ **authorization/uaa** which uses the `uaa` DB).
- Rebuild their images; update `seahorse-deploy/docker-compose.yml` image tags.
- Data migration of every DB in `seahorse-deploy/h2-data/`: `uaa`, `datasourcemanager`,
  `workflowmanager`, `schedulingmanager`, `sessionmanager`.

## Plan (implementation)

1. **Branch + backup.** Snapshot `seahorse-deploy/h2-data/` (`cp -r h2-data h2-data.bak-<date>`).
2. **Bump versions** in `project/Dependencies.scala` (H2 + Slick). Resolve any Slick 3.4/3.5 API
   changes across the storage modules; `sbt compile` all managers.
3. **SQL/evolution audit** — grep the storage impls + evolution scripts for reserved words, type
   literals, and `H2Profile`-generated DDL that H2 2.x rejects; fix.
4. **Data migration script** — per database, run with the OLD jar:
   `java -cp h2-1.4.192.jar org.h2.tools.Script -url "jdbc:h2:<file/tcp>/<db>" -user <u> -password <p> -script <db>.sql`
   then with the NEW jar into a fresh 2.x file:
   `java -cp h2-2.4.240.jar org.h2.tools.RunScript -url "jdbc:h2:file:/opt/h2-data/<db>" -user <u> -password <p> -script <db>.sql`.
   (Get each service's DB user/password from its `application.conf` / compose env.)
5. **Image** — build `seahorse-h2` on 2.4.240; build the rebuilt service images.
6. **Deploy** to a test compose first: bring up `database` (2.4.240 + migrated data) then the
   managers; verify each service connects and its API works.
7. **End-to-end** — home workflow list, open/save a workflow, datasources, sessions, schedules —
   0 errors. Re-run Trivy on the h2 image (expect H2-jar criticals cleared → 0/0).
8. **Promote** with the deploy-after-test discipline (hold live on the last-good images until green).

## Rollback

Keep the current `seahorse-h2:<sha>` (1.4.192) image, the current service images, and the
`h2-data.bak-*` snapshot. Revert `docker-compose.yml` image tags + restore the data dir to roll back
in one step — 2.x data files are one-way (1.4.x cannot read them), so **never** point 1.4.x at
migrated 2.x data.

## Effort / risk

Medium-large, higher risk than the base-image fix: touches every DB-backed service + live data.
Budget a full test cycle. The residual criticals it clears are **not remotely reachable** in the
current deployment (TCP-only server, no `-web` Console, fixed JDBC URLs), so this is hardening /
audit-clearing rather than an exposed-vulnerability fix — schedule accordingly.
