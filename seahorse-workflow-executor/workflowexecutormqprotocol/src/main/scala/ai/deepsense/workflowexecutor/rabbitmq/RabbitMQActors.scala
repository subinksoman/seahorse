/**
 * Copyright 2016 deepsense.ai (CodiLime, Inc)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package ai.deepsense.workflowexecutor.rabbitmq

import com.rabbitmq.client.{Connection, ConnectionFactory}
import org.apache.pekko.actor.{Actor, ActorLogging, ActorRef, FSM, Props}

/**
 * A message asking a [[ChannelActor]] to run `onChannel` against its RabbitMQ channel.
 * If the actor has no channel yet, the message is buffered (unless `dropIfNoChannel`)
 * and replayed once the channel is provided.
 */
case class ChannelMessage(onChannel: Channel => Unit, dropIfNoChannel: Boolean = true)

object ChannelActor {
  sealed trait State
  case object Disconnected extends State
  case object Connected extends State

  sealed trait Data
  case class Buffered(messages: Vector[ChannelMessage]) extends Data
  case class WithChannel(channel: Channel) extends Data

  /** Internal: the owning ConnectionActor provides a freshly created channel. */
  private[rabbitmq] case class ProvideChannel(channel: Channel)

  def props(setupChannel: (Channel, ActorRef) => Unit = (_, _) => ()): Props =
    Props(new ChannelActor(setupChannel))
}

/**
 * Pekko FSM wrapping a single RabbitMQ channel. Mirrors the Disconnected/Connected states and
 * ChannelMessage buffering semantics of com.thenewmotion.akka.rabbitmq.ChannelActor so existing
 * subclasses (e.g. NotifyingChannelActor, which uses onTransition) keep working. Channel-level
 * auto-recovery is handled by the amqp-client.
 */
class ChannelActor(setupChannel: (Channel, ActorRef) => Unit)
  extends FSM[ChannelActor.State, ChannelActor.Data] with ActorLogging {

  import ChannelActor._

  startWith(Disconnected, Buffered(Vector.empty))

  when(Disconnected) {
    case Event(ProvideChannel(channel), Buffered(messages)) =>
      setupChannel(channel, self)
      messages.foreach(m => runOnChannel(channel, m))
      goto(Connected) using WithChannel(channel)
    case Event(msg: ChannelMessage, Buffered(messages)) =>
      if (msg.dropIfNoChannel) stay()
      else stay() using Buffered(messages :+ msg)
  }

  when(Connected) {
    case Event(msg: ChannelMessage, WithChannel(channel)) =>
      runOnChannel(channel, msg)
      stay()
    case Event(ProvideChannel(channel), _) =>
      stay() using WithChannel(channel)
  }

  initialize()

  private def runOnChannel(channel: Channel, msg: ChannelMessage): Unit = {
    try {
      msg.onChannel(channel)
    } catch {
      case ex: Exception => log.error(ex, "ChannelMessage execution failed")
    }
  }
}

object ConnectionActor {
  /** Ask the ConnectionActor to create a channel actor from `props`; it replies with its ActorRef. */
  case class CreateChannel(props: Props, name: Option[String] = None)

  def props(factory: ConnectionFactory): Props = Props(new ConnectionActor(factory))
}

/**
 * Owns a single RabbitMQ Connection and spawns ChannelActors on request. Connection/topology
 * recovery is delegated to the amqp-client (automatic recovery is enabled on the factory).
 */
class ConnectionActor(factory: ConnectionFactory) extends Actor with ActorLogging {
  import ConnectionActor._

  factory.setAutomaticRecoveryEnabled(true)
  factory.setTopologyRecoveryEnabled(true)

  private var connection: Connection = _

  override def preStart(): Unit = {
    connection = factory.newConnection()
  }

  override def postStop(): Unit = {
    if (connection != null && connection.isOpen) {
      try connection.close() catch { case _: Exception => () }
    }
  }

  override def receive: Receive = {
    case CreateChannel(props, name) =>
      val child = name match {
        case Some(n) => context.actorOf(props, n)
        case None => context.actorOf(props)
      }
      child ! ChannelActor.ProvideChannel(connection.createChannel())
      sender() ! child
  }
}
