# T43 — Spark 4.x ANSI SQL default: spike + remediation policy

**Phase:** 4 — Spark 4.0 · **Branch:** `feature/spark4-support` · **Status:** completed (spike)
**Depends on:** T40

## Why this spike

Spark 4.0 flipped **`spark.sql.ansi.enabled` to `true` by default**. Under ANSI, casts and
string→number/date parses that previously returned `null` now **throw** at runtime
(`SparkArithmeticException`, `SparkNumberFormatException`, `CAST_INVALID_INPUT`, overflow on
integral ops, division-by-zero, etc.). This is invisible at compile time (T41 was clean) and was
flagged as the single biggest behavioral-regression risk of the Spark‑4 hop. The spike quantifies
the blast radius in deeplang and decides a policy.

## Method

Ran the full deeplang test suite against Spark 4.2.0 on JDK 17 **with Spark's 4.x defaults**
(i.e. ANSI ON — no `spark.sql.ansi.enabled=false` override anywhere):
```
JAVA_HOME=.../jdk-17.0.12 sbt -DSPARK_VERSION=4.2.0 "deeplang/test"
```

## Result (2026-07-30)

```
Total number of tests run: 345
Suites: completed 65, aborted 0
Tests: succeeded 345, failed 0, canceled 0, ignored 0, pending 0
All tests passed.   [success] Total time: 67 s
```

**345 / 345 pass, 0 failures, 0 aborted suites**, under ANSI-default. The deeplang operations'
own runtime tests do **not** regress on Spark 4.2.0's ANSI mode.

## Policy decision

**Keep ANSI enabled (the Spark 4 default). Do NOT globally set `spark.sql.ansi.enabled=false`.**

Rationale: the operation test suite passes as-is, so a blanket disable would (a) be unnecessary,
and (b) diverge Seahorse from Spark 4's intended semantics. If a *specific* operation is later
shown (by T42 golden-output / e2e on real data) to depend on legacy lenient-cast behavior, handle
it narrowly at that operation rather than globally.

## Caveats / scope

- A green **unit** suite is strong evidence but not exhaustive. The ANSI edge cases most likely to
  bite involve *specific data values* (out-of-range casts, non-numeric strings, overflow), which
  the golden-output comparison and e2e on real workflows (**T42**) exercise more broadly than
  unit fixtures. Treat T42 as the confirmatory gate.
- Model persistence behavior is a separate runtime concern (**T23**).

## Impact on the plan

This spike (plus T41's clean compile and passing unit suite) means the two biggest budgeted
Spark‑4 risks — API removals and the ANSI default — did **not** materialize for deeplang. The
remaining Spark‑4 work is now: runtime image (T44), SparkR (T45), model persistence (T23), and the
green-suite + golden-output/e2e gate (T42).
