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
