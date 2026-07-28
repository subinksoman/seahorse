# T01 — Dependency audit for Scala 2.13 + JDK 17

**Phase:** 0 — Assessment · **Status:** completed · **Source:** `project/Dependencies.scala`.

Goal: determine which current dependencies can move to Scala 2.13 / JDK 17 by version bump, and which are EOL and must be **replaced**. Drives T30 (stack replacement) and T31 (Scala 2.13).

## 1. Verdict

Two EOL frameworks block the whole 2.13 / JDK 17 migration and require rewrites, not bumps:

- **Akka 2.4.13** — no Scala 2.13 (2.13 arrived in Akka 2.5.23); `akka-agent` was **removed** in Akka 2.6; Akka ≥2.6.15 is **BSL-licensed** (commercial). 
- **Spray 1.3.3** — EOL since ~2015, superseded by Akka HTTP; **no Scala 2.13 build** at all.

Everything else is a straightforward version bump.

## 2. Recommendation — migrate the HTTP/actor stack to Apache Pekko

To get 2.13 + JDK 17 **and** avoid the Akka BSL license, move the Akka + Spray stack to **Apache Pekko** (`org.apache.pekko`) + **Pekko HTTP**:

- Pekko 1.0/1.1 is a community fork of Akka 2.6 under **Apache 2.0** — API-compatible (package rename `akka.*` → `org.apache.pekko.*`).
- Supports Scala 2.12 / 2.13 / 3 and JDK 8 / 11 / 17 / 21.
- Pekko HTTP replaces Spray's routing DSL (Spray was the direct ancestor of Akka/Pekko HTTP, so the routing concepts map over).

Alternative: Akka 2.6 + Akka HTTP (same technical result) but under the BSL license — a legal/procurement decision (**plan Decision B**).

## 3. Library-by-library

| Library | Current | Scala 2.13? | JDK 17? | Action | Risk |
|---|---|---|---|---|---|
| **akka-actor / testkit** | 2.4.13 | ✗ | ✗ | → Pekko 1.1.x (or Akka 2.6) | **High** |
| **akka-agent** | 2.4.13 | ✗ (removed in 2.6) | ✗ | **Remove** — replace with `Agent` alt / `AtomicReference` / actor state | **High** |
| **spray-can/routing/httpx/client/testkit** | 1.3.3 | ✗ | ✗ | → **Pekko HTTP** (rewrite routing) | **High** |
| **spray-json** | 1.3.3 | ✓ (has 2.13) | ✓ | Keep or → pekko-http-spray-json | Low |
| **parboiled-scala** | 1.3.1 | ✗ | — | Drops out with Spray | Low |
| **akka-rabbitmq** (thenewmotion, hardcoded `_2.12`) | 3.0.0 | ✗ | ✗ | Bump to 2.13 build (5.x/6.x) or re-impl on Pekko | Med |
| **scalatra (+scalatra-scalatest)** | 2.5.0 | ✗ | ✗ | → Scalatra 2.8.x (2.13) | Med |
| **jetty-webapp** | 9.3.8.v20160314 | n/a | ✗ | → Jetty 9.4.x (stay javax) | Med |
| **guice (+extensions)** | 4.0 | n/a | ✗ (ASM/reflection) | → Guice 5.1.0+ | Med |
| **slick** | 3.2.0 | ✗ | partial | → Slick 3.4.x/3.5.x | Med |
| **scalatest (+scalatra-test)** | 3.0.0 | ✗ | ✗ | → 3.2.x | Low |
| **mockito-core** | 1.10.19 | n/a | ✗ | → Mockito 4.x/5.x | Low |
| **metrics-scala** | 3.5.5 | ✗ | ✗ | → 4.x | Low |
| **scalaz-core** | 7.2.8 | ✓ (7.2.28+) | ✓ | Bump to 7.2.30 | Low |
| **flyway-core** | 4.0 | n/a | ✗ | → Flyway 9.x/10.x | Med |
| **h2** | 1.4.191 | n/a | ✓ | → 2.2.x (test/db) | Low |
| **cron-utils** | 5.0.4 | n/a | ✗ | → 9.x | Med |
| **quartz** | 2.3.0 | n/a | ✓ | → 2.3.2 | Low |
| **guava** | 19.0 | n/a | ✓ | → 32.x+ (CVEs) | Low |
| **jclouds openstack-keystone** | 2.1.0 | n/a | partial | → 2.5.0+ | Med |
| **commons-lang3** | 3.3.2 | n/a | ✓ | → 3.14 | Low |
| **nscala-time** | 2.14.0 | ✓ | ✓ | ok (bump optional) | Low |
| **slf4j-api** | 1.7.36 | n/a | ✓ | ok (2.x optional) | Low |
| **stampy-core** (STOMP) | 1.0-RELEASE | n/a | ? | **Investigate** — likely abandoned; may need replacement | Med |
| **cron-utils/jsr305/mimepull** | — | — | ✓ | minor bumps | Low |

## 4. Sequencing implications for T30 / T31

1. **Do the Akka→Pekko + Spray→Pekko HTTP migration first (T30)**, still on Scala 2.12 — Pekko/Pekko HTTP publish 2.12 artifacts, so this de-risks the framework rewrite before the language jump.
2. Bump Scalatra/Jetty/Guice/Slick/Flyway in the same T30 window (all have 2.12 builds of their 2.13-capable versions).
3. **Then** flip `scalaVersion` to 2.13 (T31) — by which point every remaining dependency has a 2.13 artifact.
4. `akka-agent` removal is the one behavioral change (not a bump) besides the HTTP rewrite — locate its usages early.

## 5. Open decisions (surface to plan §7)

- **B. Pekko vs Akka 2.6** — Apache 2.0 vs BSL license. Recommendation: **Pekko**.
- Confirm `stampy` (STOMP) is still viable on JDK 17 or pick a replacement.
- Whether to keep `akka-rabbitmq` (thenewmotion) or re-implement the RabbitMQ bridge directly on the new HTTP/actor stack.

> Next actionable step once a build environment exists: `grep -rn "akka.agent"` and `grep -rn "spray.routing"` to size the exact rewrite surface for T30.
