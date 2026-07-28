# T30 (cont.) — backend REST layer: Spray HTTP server → Pekko HTTP

**Phase:** Step B · **Status:** scoped (not yet implemented) · **Why separate:** this is the largest single rewrite in the migration and the only one with an *architectural* change (actor-bound → route-bound HTTP server), needing runtime HTTP verification.

## What it is
The backend services use **Spray as their HTTP server framework** (not just a client):
`spray.routing` (Directives, Route, RejectionHandler, ExceptionHandler), `spray.can.Http`
server, and an **actor-bound bind model**:

```scala
// backendcommons/.../rest/RestServer.scala (Spray)
IO(Http) ! Http.Bind(routerRef, host, port)   // binds an HttpService *actor*
```

Pekko HTTP is **route-bound** — you bind a `Route`, not an actor:
```scala
Http().newServerAt(host, port).bind(route)     // binds a Route
```

So `RestServer`, the `ApiRouterActorRef` router actor, `RestComponent`, and the Guice
`RestModule` wiring all change shape, not just imports.

## Surface (backend/root build)
| Module | akka | spray-HTTP | notes |
|---|---:|---:|---|
| **backendcommons/rest** | 10 | 13 | the framework: RestServer, RestApi, RestService, RestComponent, RestModule, Cors, rejection/exception handlers |
| workflowmanager | 7 | 10 | its REST API + JSON |
| sessionmanager | 11 | 4 | REST API + `MqModule` (2 `com.thenewmotion` ConnectionActor uses → ported package) |
| schedulingmanager | 4 | 2 | REST API |
| datasourcemanager | 0 | 1 | small |
| libraryservice | 0 | 0 | spray-json only (no change) |

`spray.json` usage stays (spray-json 1.3.6 has 2.13). Only the Spray **HTTP** pieces move.

## Mapping (Spray routing → Pekko HTTP routing)
Pekko HTTP routing is the direct descendant of Spray routing, so most of the DSL is close:
- `spray.routing.Directives` → `org.apache.pekko.http.scaladsl.server.Directives` (path, get, post, complete, pathPrefix, etc. — largely 1:1).
- `ExceptionHandler` / `RejectionHandler` → same concepts in `pekko.http.scaladsl.server`.
- `spray.http.StatusCodes/HttpResponse/MediaTypes/...` → `pekko.http.scaladsl.model.*`.
- `SprayJsonSupport` → `pekko-http-spray-json` (already used elsewhere in this migration).
The **non-mechanical** parts: `RestServer` bind, the router-actor removal, `RestModule`
(Guice) providing a `Route` instead of an `ActorRef`, `Cors` directive, and `sealRoute`
→ `Route.seal`.

## Recommended order
1. **backendcommons/rest framework first** (RestServer, RestApi, RestModule, RestComponent,
   Cors, handlers) — everything else extends it. Add Pekko HTTP deps to the **root**
   `project/Dependencies.scala` (it has its own akka/spray helpers, separate from the WE build).
2. Per-service APIs: workflowmanager, sessionmanager (+ MqModule ConnectionActor), schedulingmanager, datasourcemanager.
3. Scalatra bump (2.5 → 2.8) if any service uses Scalatra alongside Spray.

## Verification requirement
Unlike the WE modules (verified by compile + unit/broker tests), the REST server must be
**runtime-verified**: bind the migrated `Route` and issue a request (e.g. an in-process
`Http().newServerAt("localhost", 0).bind(route)` + a client call in an integration test, or
a smoke test hitting a health endpoint). Compile-green is necessary but not sufficient here.

## Status of the overall Pekko migration
- **workflow-executor build: DONE** (commons, deeplang, mqprotocol, workflowexecutor) — compiles
  green on Pekko + Spark 3.4.4 / JDK 11; RabbitMQ port broker-verified (T33).
- **backend REST layer: this document** — the largest remaining piece.
- After it: **Scala 2.13** flip, then **JDK 17**.
