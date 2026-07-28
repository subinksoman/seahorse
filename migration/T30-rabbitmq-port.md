# T30 (cont.) — akka-rabbitmq → Pekko port (the one broker-dependent piece)

**Phase:** Step B · **Status:** planned (not yet implemented) · **Why separate:** this is the only remaining Step-B item that (a) is a library port, not an import rename, and (b) cannot be verified without a running RabbitMQ broker.

## What depends on it
`workflowexecutormqprotocol` uses `com.thenewmotion.akka.rabbitmq` (Akka-based, hardcoded `_2.12`, no Pekko or 2.13 build). It's on the **critical path**: `sessionmanager` → `workflowexecutormqprotocol`, and `workflowexecutor` → it too. Nothing downstream compiles on Pekko/2.13 until this is ported.

## Exact surface used (3 files)
- `MQCommunicationFactory.scala`: `connection.createChannel(props, Some(name))(timeout)` (implicit on the ConnectionActor `ActorRef`), `ChannelActor` (base of `NotifyingChannelActor`, FSM states `Connected`/`Disconnected`, `onTransition`), `ChannelMessage`, `Channel` (= `com.rabbitmq.client.Channel`).
- `MQPublisher.scala`: `publisherActor ! ChannelMessage(channel => channel.basicPublish(...), dropIfNoChannel = false)`.
- `MQSubscriber.scala`: `Channel`, `DefaultConsumer`, `Envelope`, `BasicProperties` (all `com.rabbitmq.client.*`, re-exported by akka-rabbitmq).
- **ConnectionActor is created outside** this module (in sessionmanager/workflowexecutor bootstrap) — that call site must change too.

So akka-rabbitmq supplies: `ConnectionActor` (connection + auto-reconnect), `ChannelActor` (per-channel FSM that buffers `ChannelMessage`s while disconnected and replays on reconnect), `ChannelMessage`, and convenience re-exports.

## Recommended approach — **vendor + rename** (not reimplement)
`com.thenewmotion:akka-rabbitmq` is **Apache-2.0** and small (~4 source files: `ConnectionActor`, `ChannelActor`, `RabbitMQ`, package object with the `createChannel` implicit). Vendor those sources into an internal package (e.g. `ai.deepsense.workflowexecutor.rabbitmq.pekko`) and apply the mechanical `akka.*` → `org.apache.pekko.*` rename. This **preserves the proven connection/channel lifecycle** (reconnection, buffering) instead of re-deriving subtle FSM logic from scratch.

Alternative (higher risk): reimplement ConnectionActor/ChannelActor from scratch on Pekko + the RabbitMQ Java client (~200-300 lines with recovery). Only if vendoring's license/attribution is undesired.

## Verification requirement (why this can't be "compile-only")
The other Step-B modules were verified by compile + unit tests with mocked HTTP. RabbitMQ connection/channel lifecycle (reconnect, message buffering while disconnected) only exercises correctly against a **real broker**. Plan:
1. Vendor+rename → `mqprotocol/compile` green (compile gate).
2. Update the ConnectionActor creation site + `MQCommunicationFactory` to the ported package.
3. **Integration test against a RabbitMQ broker** (docker `rabbitmq:3-management`): publish/subscribe round-trip + a forced-reconnect scenario. This is the true gate — do not mark done on compile alone.

## Then the rest of the cascade
Once mqprotocol is ported: `workflowexecutor` (16 akka + 5 spray-HTTP) and the backend services (workflowmanager, sessionmanager, datasourcemanager, libraryservice, schedulingmanager — Scalatra 2.5→2.8 + Pekko-HTTP for Spray bits) follow the proven `commons` pattern, then the Scala 2.13 flip and JDK 17.
