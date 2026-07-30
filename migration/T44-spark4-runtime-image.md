# T44 — Spark 4.2 runtime image (`ae-spark` / `seahorse-spark`)

**Phase:** 4 — Spark 4.0 · **Branch:** `feature/spark4-support` · **Status:** done
**Depends on:** T40 · **Image:** `deployment/spark-docker/Dockerfile`

Point the Spark runtime image (base for the workflow executor) at **Spark 4.2.0** and make it
build + run on the slow-network environment. Verified by running PySpark inside the built image.

## Dockerfile changes

1. **Package name per Spark major.** Spark 4.x is Scala 2.13 ONLY, so the tarball is
   `spark-4.2.0-bin-hadoop3.tgz` (no `-scala2.13` suffix — that variant 404s for 4.x). Pre-4.x
   keeps its `-scala2.13` variant. Computed in the RUN via `case "$SPARK_VERSION"`.
2. **Log4j.** The 1.x-strip + 2.17.2-downgrade is skipped for 4.x (Spark 4.2 already bundles a
   patched Log4j 2.x); pre-4.x behavior unchanged.
3. **Download robustness.** archive.apache.org primary + dlcdn.apache.org fallback, both
   `--timeout=30 --tries=2 --continue`. (dlcdn intermittently stalled at 0 B/s here and the old
   `wget -q` had no timeout, so it hung forever instead of falling back.)
4. **pip resilience.** `pip install --timeout 120 --retries 10` — large wheels (tensorflow ~500 MB)
   over the slow link otherwise trip pip's default 15 s read timeout (`files.pythonhosted.org`
   ReadTimeoutError).

## requirements.txt — Spark 4.2 minimums

Discovered by running PySpark in the built image (`toPandas` raised
`UNSUPPORTED_PACKAGE_VERSION`):

| Package | Was (Spark 3.4) | Now (Spark 4.2) | Why |
|---|---|---|---|
| pandas | `>=1.5,<2.2` | `>=2.2,<3` | Spark 4.2 `require_minimum_pandas_version` >= 2.2.0 |
| pyarrow | `==15.0.2` | `>=18.0.0` | Spark 4.2 wants PyArrow >= 18 for the optimized Arrow path (15.x falls back to slow non-Arrow) |

numpy stays `<2` (pandas 2.2/2.3 + these ML libs are fine on numpy 1.26).

## Verification (in the built image, JDK 17)

`docker run --entrypoint bash seahorse-spark:spark4-test`:
- `spark-submit --version` → **Spark 4.2.0**, **Scala 2.13.18**, **OpenJDK 17.0.19**.
- Python **3.12.7**; `pyspark 4.2.0`, `pyarrow 15/18`, `pandas 2.3.3`, `numpy 1.26.4`.
- `JDK_JAVA_OPTIONS` (the Spark-4 add-opens incl. `sun.security.ssl`) picked up by the JVM.
- SparkSession starts (local[1]); with **pandas 2.3.3**, `spark.range(5)...toPandas()` returns the
  correct rows → **PySpark bridge works on Spark 4.2**.
- First image (pandas 2.1.4 / pyarrow 15.0.2) failed `toPandas` (pandas < 2.2) → drove the pins
  above.
- **Final image (rebuilt with pandas 2.3.3 / pyarrow 25.0.0): the Arrow-OPTIMIZED `toPandas`
  passes** with `spark.sql.execution.arrow.pyspark.fallback.enabled=false` and warnings-as-errors
  (`T44_ARROW_OPTIMIZED_OK`) — i.e. the fast Arrow path, not the fallback. T44 done.

## Latest pandas / numpy support

- **pandas:** `>=2.2,<3` installs the latest 2.x (2.3.3). This is the newest pandas Spark 4.2
  supports — pyspark 4.2 does not support the pandas 3.0 rewrite, so `<3` is intentional.
- **pyarrow:** unpinned above 18 → resolves to the latest (25.0.0).
- **numpy:** still `<2` (1.26.4) — **not** the latest. Spark 4.2 itself supports numpy 2; the cap
  is for the bundled ML stack (tensorflow / numba-via-shap / xgboost / lightgbm). Lifting it to
  numpy 2 needs those libraries verified on the numpy-2 ABI first (numba is the usual gate). Open
  follow-up if "latest numpy" is required.

## Notes / handoff

- Image size ~7.55 GB (Ubuntu + JDK 17 + Spark 4.2 + Miniconda + the ML stack incl. tensorflow).
- The build is bandwidth-bound in this environment; the mirror-fallback + pip-retry changes make
  it complete rather than hang. Spark/Miniconda layers cache, so requirements-only rebuilds re-run
  just the pip layer.
- `manage-docker.py` still defaults `spark_version="3.4.4"`; build the 4.2 image with
  `--build-arg SPARK_VERSION=4.2.0` (or flip the default at release time — T46).
- Rollback: `SPARK_VERSION=3.4.4` still selects the `-scala2.13` tarball and the log4j swap.
