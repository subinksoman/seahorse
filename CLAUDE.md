# CLAUDE.md — Seahorse modernization workflow

Guidance for continuing the Spark/Python/Jupyter modernization. The plan and live task
sheet are in [update.md](update.md); per-task deliverables live in [migration/](migration/).

## Per-task loop (do this for every task Txx)

1. **Work the task** in dependency order (see `depends_on` in the update.md JSON). Do not start a
   task whose dependencies are not `completed`.
2. **Verify honestly.** Build/test-gated tasks must actually compile and pass tests on the correct
   JDK before being marked done. Never record a passing build that was not run — if it cannot be
   verified in the current environment, leave the task `pending` and say so.
3. **Deliverable.** Assessment tasks produce a `migration/Txx-*.md` doc. Code tasks change source.
4. **Update the sheet.** Flip that task's `"status"` to `"completed"` in the update.md JSON.
5. **Commit** just that task's files with message form:
   `Txx: <imperative summary>` + a body explaining what and why, ending with the Co-Authored-By
   trailer. One task per commit.

## Conventions

- **Branch:** `feature/modernization-spark-latest` (all migration work).
- **Staging:** never `git add -A`; stage only the task's files + `update.md`. `update.md` is the
  living tracker and IS committed on this branch (it was intentionally kept out of the v3.0.0.7
  release commit, but here it tracks progress).
- **Spark version arms:** add new versions via the `sparkutils<ver>` shim + `csv*`/`readjson*`
  feature modules and new `case` arms in `project/Dependencies.scala` and
  `seahorse-workflow-executor/build.sbt` — never edit the `3.0.x` shim in place. `SPARK_VERSION`
  selects the arm.

## Build environment prerequisites (required before T02+)

The assessment tasks (T00, T01) need none of this. Everything build/test-gated does:

- **JDK 11** to build/test the *current* Spark 3.0.0 baseline (T02). The active JDK here is **Java 8**,
  which the project's `--add-opens` flags reject — Java 8 cannot run this build.
- **JDK 17** for the migration target (T11 onward).
- **Free disk** — an sbt build pulls multiple GB into `~/.ivy2` / `~/.cache/coursier`. Keep several
  GB free.
- **Python 3.12** (via pyenv/conda) for the PySpark/executor tasks (T51).

Set the JDK per phase with `JAVA_HOME` (e.g. `JAVA_HOME=/usr/lib/jvm/java-11-openjdk sbt ...`).

## Status snapshot

- Done: T00 (Spark API inventory), T01 (library audit).
- Blocked on the environment above: T02 and all later build/test tasks.
