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

package ai.deepsense.workflowexecutor

import scala.concurrent.Await

import org.apache.pekko.actor.{ActorRef, Props}
import org.apache.pekko.pattern.ask
import org.apache.pekko.util.Timeout

/**
 * Pekko-based replacement for com.thenewmotion.akka.rabbitmq (which has no Pekko/Scala 2.13
 * build). Re-exports the RabbitMQ Java client types the codebase used from the old library and
 * provides the `connection.createChannel(...)` convenience the ConnectionActor exposes.
 * Reconnection/topology recovery is delegated to the amqp-client (automatic recovery), so the
 * actors here stay thin. See migration/T30-rabbitmq-port.md.
 */
package object rabbitmq {
  type Channel = com.rabbitmq.client.Channel
  type BasicProperties = com.rabbitmq.client.AMQP.BasicProperties
  type DefaultConsumer = com.rabbitmq.client.DefaultConsumer
  type Envelope = com.rabbitmq.client.Envelope

  implicit class RichConnectionActor(val connectionActor: ActorRef) extends AnyVal {
    /** Create a channel actor as a child of the ConnectionActor and return its ActorRef. */
    def createChannel(props: Props, name: Option[String] = None)(implicit timeout: Timeout): ActorRef = {
      Await.result(
        (connectionActor ? ConnectionActor.CreateChannel(props, name)).mapTo[ActorRef],
        timeout.duration)
    }
  }
}
