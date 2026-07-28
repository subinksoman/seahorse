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

import java.util.UUID
import java.util.concurrent.{CountDownLatch, LinkedBlockingQueue, TimeUnit}

import scala.concurrent.duration._

import com.rabbitmq.client.ConnectionFactory
import org.apache.pekko.actor.{ActorRef, ActorSystem}
import org.apache.pekko.testkit.TestKit
import org.apache.pekko.util.Timeout
import org.scalatest.{BeforeAndAfterAll, Matchers, WordSpecLike}

/**
 * Broker round-trip test for the Pekko akka-rabbitmq replacement (task T33). Requires a running
 * RabbitMQ broker on localhost:5672 -- start it with:
 *   docker compose -f deployment/rabbitmq/docker-compose.test.yml up -d
 * Exercises ConnectionActor.createChannel, the ChannelActor setup callback (queue declare +
 * consumer) and ChannelMessage publishing against a real broker -- the gate the FSM unit test
 * (ChannelActorSpec) cannot cover.
 */
class RabbitMQIntegSpec
  extends TestKit(ActorSystem("RabbitMQIntegSpec"))
  with WordSpecLike
  with Matchers
  with BeforeAndAfterAll {

  private val factory = new ConnectionFactory()
  factory.setHost("localhost")
  factory.setPort(5672)

  override def afterAll(): Unit = TestKit.shutdownActorSystem(system)

  "The Pekko ConnectionActor/ChannelActor port" should {
    "publish and consume a message through a real broker" in {
      implicit val timeout: Timeout = Timeout(15.seconds)
      val queueName = "seahorse-t33-" + UUID.randomUUID().toString
      val delivered = new LinkedBlockingQueue[String]()
      val consumerReady = new CountDownLatch(1)

      val connection: ActorRef = system.actorOf(ConnectionActor.props(factory), "conn-" + UUID.randomUUID())

      // Consumer channel: declare the queue and register a consumer that records deliveries.
      // Channel setup runs asynchronously in the ChannelActor, so signal readiness via a latch
      // and await it before publishing -- otherwise the message can be sent before the queue
      // exists and is dropped by the default exchange.
      connection.createChannel(ChannelActor.props { (channel, _) =>
        // exclusive (not transient non-exclusive) for RabbitMQ 4.x compatibility
        channel.queueDeclare(queueName, false, true, true, null)
        channel.basicConsume(queueName, true, new DefaultConsumer(channel) {
          override def handleDelivery(
              consumerTag: String,
              envelope: Envelope,
              properties: BasicProperties,
              body: Array[Byte]): Unit = delivered.put(new String(body, "UTF-8"))
        })
        consumerReady.countDown()
      }, Some("consumer-" + UUID.randomUUID()))

      consumerReady.await(15, TimeUnit.SECONDS) shouldBe true

      // Publisher channel: publish to the default exchange (routing key == queue name).
      val publisher: ActorRef =
        connection.createChannel(ChannelActor.props(), Some("publisher-" + UUID.randomUUID()))
      publisher ! ChannelMessage(_.basicPublish("", queueName, null, "hello-t33".getBytes("UTF-8")))

      val received = delivered.poll(15, TimeUnit.SECONDS)
      received shouldBe "hello-t33"
    }
  }
}
