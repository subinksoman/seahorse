# 6D Analytical Engine — Release Notes v4.2.0.7.1

**Patch release on top of [v4.2.0.7](RELEASE-NOTES-v4.2.0.7.md)**
Format: Markdown · organized per Docker image

> Incremental patch over v4.2.0.7. Bundles the earlier frontend fixes with new backend,
> executor, and build-tooling changes. All images are published under tag `4.2.0.7.1`.

---

## 1. Overview

v4.2.0.7.1 collects a frontend patch and three backend/build changes:

- **Scheduling** gains an on-demand "run now" API — execute a workflow once, immediately, without
  creating a cron schedule.
- **Executor** CSV writes now emit the correct delimiter (a real `,`) instead of the literal text
  `Comma()`, and writing to `EXTERNALFILE` datasources is now supported.
- **Spark image** installs Spark offline from a locally-provided tarball when present, falling back
  to download — dramatically faster rebuilds on slow networks.

---

## 2. Changes per image

### `ae-frontend:4.2.0.7.1`
- Cluster-preset numeric fields (`executorCores` / `totalExecutorCores` / `numExecutors`) coerce to
  integers so they pass schema validation.
- Node-properties Parameters/Ports tabs no longer navigate to home (`preventDefault` on the tab
  anchors).

### `ae-schedulingmanager:4.2.0.7.1`
- **New endpoint** `POST /schedulingmanager/v1/workflow/{workflowId}/run` — runs a workflow once,
  immediately, without persisting a schedule. Body: `{"emailForReports": "...", "presetId": N}`.
- Returns `200 {"status":"accepted","runId":"<cloned-workflow-id>"}`: the clone step is awaited so the
  caller gets a trackable run id right away, while session/execution/email complete in the background.
- Reuses the existing scheduler execution pipeline (clone → session → run → email report).

### `ae-sessionmanager:4.2.0.7.1`
- **CSV delimiter fix**: `DriverFiles` now resolves the column-separator choice via
  `CsvParameters.determineColumnSeparatorOf(...)` instead of `.toString` on the choice object, so CSV
  output uses the real separator (`,`) rather than the literal `Comma()`.
- **Write to external-file datasources**: `WriteDatasource` handles `EXTERNALFILE` targets instead of
  throwing "Cannot write to external file".
- Rebuilt on the new `ae-spark:4.2.0.7.1` base.

### `ae-spark:4.2.0.7.1`
- **Offline-first Spark install**: if `spark-<ver>-bin-hadoop<h>.tgz` is present in the
  `deployment/spark-docker/` build context, it is used instead of downloading (~550 MB) from the Apache
  mirror; otherwise the build falls back to the network download. The tarball is git-ignored.
- Spark 4.2.0, Scala 2.13.18, OpenJDK 17.

---

## 3. Upgrade notes

- No schema or config migrations. Pull the `4.2.0.7.1` images and recreate the affected services
  (`schedulingmanager`, `sessionmanager`; `spark` is the sessionmanager base).
- The run-now endpoint is additive; existing schedule endpoints are unchanged.
