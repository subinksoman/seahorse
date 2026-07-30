# T41 — Spark 4.x breaking changes in deeplang

**Phase:** 4 — Spark 4.0 · **Branch:** `feature/spark4-support` · **Status:** partial (compile-clean
verified; runtime/test verification deferred to T43/T42) · **Depends on:** T40

## Headline result

**`deeplang` + `api` (and the whole dependency chain) compile CLEAN against Spark 4.2.0 on
JDK 17 — 0 errors.** No compile-time Spark‑4 API‑removal fixes were needed.

This is the key de‑risking finding for the Spark‑4 hop: the expensive-looking "resolve API
removals across 133 ops / 195 doperables" turns out to be **near-zero at compile time**, because
the 3.4.4 migration already moved deeplang's Spark usage onto public/stable APIs.

## Verification (2026-07-30, JDK 17)

Command (executor build):
```
JAVA_HOME=.../jdk-17.0.12 sbt -DSPARK_VERSION=4.2.0 "api/compile" "deeplang/compile"
```
Result: `SPARK_VERSION: 4.2.0`, Scala 2.13.18. Every module compiled with `[success]`:

| Module | Result |
|---|---|
| `sparkutils4.0.x`, `csv4_0`, `sparkutils_test` | ✅ (from T40) |
| `commons`, `reportlib`, `graph`, `api` | ✅ |
| **`deeplang`** (1678 `.class` files) | ✅ **0 errors** |

Tally: **2 `[success]`, 0 `[error]`**.

## Warnings (400 total) — all Scala 2.13 deprecations, none Spark‑4

Not a single removed‑Spark‑API error. The warnings are pre‑existing 2.13 lint/deprecations,
independent of the Spark version:

| Count | Warning |
|---:|---|
| 33 | generic `deprecated (since 2.13.x)` |
| 13 | `copyArrayToImmutableIndexedSeq` deprecated |
| 9 | passing an explicit array to a varargs method (defensive copy) |
| 5 | `in` scoping deprecated (sbt build files) |
| 3 | `zipped` deprecated |
| 3 | `toStream` deprecated |
| 2 | `mapValues` deprecated |
| 1 each | `replaceAllLiterally`, `filterKeys`, widening conversion |

These are cleanup nice‑to‑haves (2.13 hygiene), **not** blockers for Spark 4.x. They exist on
the 3.4.4 baseline too.

## Interpretation — where the real Spark‑4 work is

Compile‑time is done. The remaining Spark‑4 risk is **runtime behavior**, not the API surface:

1. **ANSI SQL default = ON (T43)** — the big one. Casts/parses that returned `null` on 3.4 now
   throw on 4.x. This does **not** show up at compile time; it surfaces when deeplang operations
   run. Must be quantified by running the deeplang test suite (and/or golden workflows) on 4.2.0.
2. **Model persistence (T23)** — `ml.util` writer/reader format + `sparkVersion` metadata; a
   runtime save/load concern.
3. **Other behavioral changes** — datasource defaults, timestamp/calendar, config removals —
   caught by the test suite + golden‑output comparison (T42).

## Status & next step

- **T41 (compile scope): done and clean** — no source changes required. Marked `partial` in the
  tracker because the *runtime* half of "resolve breaking changes" is validated by running the
  suite, which is T43 (ANSI) + T42 (green suite + golden output).
- **Next:** run `deeplang/test` (and `commons`/service tests) against `SPARK_VERSION=4.2.0` on
  JDK 17 to surface ANSI/runtime failures — this is the T43 spike, and its failures (if any) are
  the concrete remainder of T41.
- Rollback unchanged: `SPARK_VERSION=3.4.4`.
