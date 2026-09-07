# Spark Standalone mode — how to start & test

How to bring up a **Spark 4.2.0 standalone cluster** from the local install and validate it, then
(optionally) point the **6D Analytical Engine** at it. Verified working on host `192.168.1.55`.

---

## 0. Environment

| Item | Value |
|---|---|
| Spark install (`SPARK_HOME`) | `/home/subinsoman/binaries/spark-4.2.0-bin-hadoop3` |
| Spark version | 4.2.0 (Scala 2.13, Hadoop 3.5.0) |
| Java (`JAVA_HOME`) | `/home/subinsoman/binaries/jdk-17.0.12_linux-x64_bin/jdk-17.0.12` (JDK 17) |
| Host IP | `192.168.1.55` |

```bash
export SPARK_HOME=/home/subinsoman/binaries/spark-4.2.0-bin-hadoop3
export JAVA_HOME=/home/subinsoman/binaries/jdk-17.0.12_linux-x64_bin/jdk-17.0.12
```

**Ports** (8080 and 4040 were already in use on this host, so the master UI is moved to **8082**):

| Port | Role |
|---|---|
| 7077 | Master RPC (`spark://192.168.1.55:7077`) |
| 8082 | Master web UI (default 8080 was busy) |
| 8081 | Worker web UI |
| 6066 | Master REST submit server |
| 4040 | Running app UI (auto, per driver) |

---

## 1. Start the master

```bash
export SPARK_HOME=/home/subinsoman/binaries/spark-4.2.0-bin-hadoop3
export JAVA_HOME=/home/subinsoman/binaries/jdk-17.0.12_linux-x64_bin/jdk-17.0.12
export SPARK_MASTER_HOST=192.168.1.55
export SPARK_MASTER_WEBUI_PORT=8082          # 8080 is busy on this host

"$SPARK_HOME/sbin/start-master.sh"
```

Confirm:
```bash
ss -ltn | grep -E ':7077|:8082'              # both LISTENING
# Master log: "Starting Spark master at spark://192.168.1.55:7077" ... "New state: ALIVE"
```
- Master URL: **`spark://192.168.1.55:7077`**
- Master UI: **http://192.168.1.55:8082**

---

## 2. Start a worker

```bash
export SPARK_HOME=/home/subinsoman/binaries/spark-4.2.0-bin-hadoop3
export JAVA_HOME=/home/subinsoman/binaries/jdk-17.0.12_linux-x64_bin/jdk-17.0.12
export SPARK_WORKER_WEBUI_PORT=8081

"$SPARK_HOME/sbin/start-worker.sh" spark://192.168.1.55:7077
```

Confirm (master log):
```
Registering worker 192.168.1.55:xxxxx with 8 cores, 14.4 GiB RAM
```
- Worker UI: **http://192.168.1.55:8081**

> To add more workers (same host or another machine with the same Spark + JDK), repeat step 2. On a
> second machine just point it at `spark://192.168.1.55:7077`.

---

## 3. Validate (SparkPi)

```bash
export SPARK_HOME=/home/subinsoman/binaries/spark-4.2.0-bin-hadoop3
export JAVA_HOME=/home/subinsoman/binaries/jdk-17.0.12_linux-x64_bin/jdk-17.0.12

"$SPARK_HOME/bin/spark-submit" \
  --master spark://192.168.1.55:7077 \
  --class org.apache.spark.examples.SparkPi \
  --conf spark.cores.max=2 \
  "$SPARK_HOME"/examples/jars/spark-examples_2.13-4.2.0.jar 100
```

Expected output:
```
Job 0 finished: reduce at SparkPi.scala:38
Pi is roughly 3.14159...
```
The app also appears (FINISHED) in the master UI at http://192.168.1.55:8082. ✅ **Verified.**

Optional interactive test:
```bash
"$SPARK_HOME/bin/spark-shell" --master spark://192.168.1.55:7077
# scala> spark.range(1000000).count()
```

---

## 4. Use it from the 6D Analytical Engine (optional)

The Analytical Engine currently runs Spark in **`local[*]`** mode (the session manager submits with
`--master local[*]`). To run a workflow on this standalone cluster instead, add a **Standalone** cluster
preset in the UI and select it when you Start editing / Run:

1. In the editor status bar → **Cluster presets** → add a preset:
   - **Type:** Standalone
   - **Master URI / Spark master:** `spark://192.168.1.55:7077`
   - Executor cores/memory as desired (worker has 8 cores / 14.4 GiB).
2. Start editing / Run the workflow with that preset selected.

**Reachability:** the session manager container runs with `network_mode: host`, so it can reach
`spark://192.168.1.55:7077`. The standalone workers run on the host and can reach the Docker services
(RabbitMQ `192.168.0.9`, etc.) via the host's `192.168.0.1` bridge gateway.

### ⚠️ Caveats for Analytical Engine on host-standalone
- **Python path:** the session manager submits with `--python-binary /opt/conda/bin/python`, which is a
  path *inside the container*. Host standalone workers don't have `/opt/conda`. Pure-Spark/Scala
  operations run fine; **PySpark/Python operations** need a matching Python 3.12 on the host at the same
  path (symlink `/opt/conda/bin/python` → a host Python 3.12) or a preset that overrides the driver/
  executor Python binary.
- **Executor deps:** `we.jar` + `we-deps.zip` are shipped by `spark-submit` (`--jars`/`--files`), so the
  workers pick them up automatically.
- **Same versions everywhere:** master, workers and the submitting Spark must all be **4.2.0 / Scala 2.13
  / JDK 17** (they are — the session manager bundles the same Spark 4.2.0).

---

## 5. Stop the cluster

```bash
export SPARK_HOME=/home/subinsoman/binaries/spark-4.2.0-bin-hadoop3
"$SPARK_HOME/sbin/stop-worker.sh"
"$SPARK_HOME/sbin/stop-master.sh"
# or: "$SPARK_HOME/sbin/stop-all.sh"
```

Logs live in `"$SPARK_HOME"/logs/` (`*master*.out`, `*worker*.out`); worker scratch in
`"$SPARK_HOME"/work/`.

---

## Quick reference

| What | Value |
|---|---|
| Master URL | `spark://192.168.1.55:7077` |
| Master UI | http://192.168.1.55:8082 |
| Worker UI | http://192.168.1.55:8081 |
| Submit a job | `spark-submit --master spark://192.168.1.55:7077 …` |
| Start / stop | `sbin/start-master.sh` + `sbin/start-worker.sh <master>` / `sbin/stop-all.sh` |

*Verified 2026-08-11 on host 192.168.1.55 — master + 1 worker (8 cores / 14.4 GiB), SparkPi passed.*
