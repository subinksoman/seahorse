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

import java.util.concurrent.atomic.AtomicInteger

import org.apache.pekko.actor.ActorSystem
import org.apache.pekko.testkit.{TestFSMRef, TestKit}
import org.mockito.Mockito.mock
import org.scalatest.{BeforeAndAfterAll, Matchers, WordSpecLike}

/**
 * Broker-free verification of the ported ChannelActor FSM (buffering/replay semantics of the
 * old akka-rabbitmq ChannelActor). Uses TestFSMRef for synchronous state/message processing, so
 * no RabbitMQ broker is needed. The actual broker round-trip remains an integration-test gate
 * (see migration/T30-rabbitmq-port.md).
 */
class ChannelActorSpec
  extends TestKit(ActorSystem("ChannelActorSpec"))
  with WordSpecLike
  with Matchers
  with BeforeAndAfterAll {

  override def afterAll(): Unit = TestKit.shutdownActorSystem(system)

  private def newChannel(): Channel = mock(classOf[Channel])

  "ChannelActor" should {
    "start Disconnected and run setupChannel + buffered messages once a channel is provided" in {
      val setupCount = new AtomicInteger(0)
      val runCount = new AtomicInteger(0)
      val fsm = TestFSMRef(new ChannelActor((_, _) => setupCount.incrementAndGet()))

      fsm.stateName shouldBe ChannelActor.Disconnected

      // Sent while disconnected with dropIfNoChannel = false -> buffered, not yet run.
      fsm ! ChannelMessage(_ => runCount.incrementAndGet(), dropIfNoChannel = false)
      runCount.get shouldBe 0

      // Provide the channel -> transitions to Connected, runs setup + replays buffered message.
      fsm ! ChannelActor.ProvideChannel(newChannel())
      fsm.stateName shouldBe ChannelActor.Connected
      setupCount.get shouldBe 1
      runCount.get shouldBe 1

      // Sent while connected -> runs immediately.
      fsm ! ChannelMessage(_ => runCount.incrementAndGet())
      runCount.get shouldBe 2
    }

    "drop messages sent while disconnected when dropIfNoChannel = true" in {
      val runCount = new AtomicInteger(0)
      val fsm = TestFSMRef(new ChannelActor((_, _) => ()))

      fsm ! ChannelMessage(_ => runCount.incrementAndGet(), dropIfNoChannel = true)
      fsm ! ChannelActor.ProvideChannel(newChannel())

      fsm.stateName shouldBe ChannelActor.Connected
      runCount.get shouldBe 0 // dropped, not replayed
    }
  }
}
