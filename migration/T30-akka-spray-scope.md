# T30 — Akka / Spray → Pekko rewrite scope (Step B)

**Phase:** Step B (Scala 2.13 + JDK 17) · **Status:** scoping done · **Method:** import grep across the repo (`target/` excluded).

Purpose: size the EOL-framework rewrite that blocks Scala 2.13, before starting it. The picture is **much smaller than the T01 worst case**.

## 1. Key finding — separate `spray-json` from the Spray HTTP framework

"Spray" appears in **225 files**, but they split into two very different buckets:

| Bucket | Files | 2.13? | Action |
|---|---:|---|---|
| `spray.json` (JSON serialization) | **215** | ✅ **yes** — spray-json 1.3.6 is cross-published for 2.13 | **Bump version, no rewrite** |
| Spray **HTTP framework** (`spray.routing/http/httpx/client/can/util`) | **56** | ✗ EOL, no 2.13 | **Rewrite to Pekko HTTP** |

So the real rewrite surface is **~56 files**, not 225. The bulk of "Spray" usage is just JSON, which survives the 2.13 jump untouched.

## 2. Akka surface

- **62 files** import `akka.*` — mostly actors/streams. Migration to Pekko is a **mechanical package rename** `akka.*` → `org.apache.pekko.*` (Pekko 1.x is a source-compatible fork of Akka 2.6).
- **`akka.agent`: 0 uses** — the removed-in-Akka-2.6 module (a T01 risk) is **not used**. No behavioral rewrite there.
- **akka-rabbitmq (`com.thenewmotion`): 7 files** — needs a 2.13-capable RabbitMQ integration (op-rabbit/Pekko-based, or a newer thenewmotion build).

## 3. Distribution by module (where the work is)

| Module | spray/akka files |
|---|---:|
| deeplang | 106 (mostly spray.json — serialization) |
| workflowexecutor | 32 |
| workflowmanager | 25 |
| backendcommons | 20 |
| commons (WE) | 17 |
| workflowjson | 16 |
| workflowexecutormqprotocol | 16 |
| sessionmanager | 14 |
| reportlib, schedulingmanager, libraryservice, e2etests, datasourcemanager | ≤8 each |

deeplang's 106 are almost all `spray.json` (DataFrame/report serialization) → version bump only. The **HTTP rewrite (56 files)** concentrates in the service modules: workflowmanager, sessionmanager, datasourcemanager, libraryservice, schedulingmanager (Scalatra/Spray endpoints) + WE commons/workflowexecutor.

## 4. Recommended Step B sequence (each verifiable on Scala 2.12 first)

1. **Akka 2.4.13 → Pekko 1.1.x on Scala 2.12** — package rename `akka.*`→`org.apache.pekko.*`; Pekko publishes 2.12 artifacts, so this compiles/tests before the language jump. (Decision B: Pekko chosen for Apache-2.0 license per [T01](T01-library-audit.md); confirm before starting.)
2. **Spray HTTP → Pekko HTTP** (56 files) — rewrite the routing DSL; keep `spray-json` (bump to 1.3.6) or move to pekko-http-spray-json.
3. **akka-rabbitmq → Pekko-based** RabbitMQ (7 files).
4. **Bump the rest** (Scalatra 2.8, Jetty 9.4, Guice 5.1, Slick 3.4, Flyway 9, scalatest 3.2, mockito 4) — all have 2.12 builds of their 2.13-capable versions.
5. **Flip `scalaVersion` 2.12 → 2.13** — fix collections (`CollectionConverters`, `Seq` variance) across the backend.
6. **JDK 11 → 17** — extend the `--add-opens` set (already partly in place from Step A) and confirm Spark 3.4.4 runs on 17.

## 5. Revised effort read
T01 budgeted ~22 days for T30 assuming a full Spray+Akka rewrite. Splitting off `spray-json` (215 files, no change) and finding `akka.agent` unused cuts the hard surface to **~56 HTTP files + 62 mechanical renames + 7 RabbitMQ**. Still the largest phase, but materially smaller and lower-risk than the worst case.

## 6. Decision to confirm before starting
**Pekko vs Akka 2.6** (plan Decision B) — Apache-2.0 (Pekko) vs BSL (Akka). Recommendation stands: **Pekko**. This is a licensing/business call; flag before the mechanical rename since it sets the target package.
