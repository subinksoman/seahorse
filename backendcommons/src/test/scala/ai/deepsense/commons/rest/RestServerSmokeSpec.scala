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

package ai.deepsense.commons.rest

import scala.concurrent.Await
import scala.concurrent.duration._

import org.apache.pekko.actor.ActorSystem
import org.apache.pekko.http.scaladsl.Http
import org.apache.pekko.http.scaladsl.model.{HttpRequest, StatusCodes}
import org.apache.pekko.http.scaladsl.server.Directives._
import org.apache.pekko.http.scaladsl.server.Route
import org.apache.pekko.http.scaladsl.unmarshalling.Unmarshal
import org.scalatest.BeforeAndAfterAll
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.{AnyWordSpec => WordSpec}

/**
 * Runtime verification that the REST framework, migrated from Spray's actor-bound HttpService to
 * Pekko HTTP's route-bound model, actually binds and serves HTTP requests. Binds a RestComponent's
 * route (as RestServer does) on an ephemeral port and issues a real request in-process -- the gate
 * a compile-only check cannot cover.
 */
class RestServerSmokeSpec extends WordSpec with Matchers with BeforeAndAfterAll {

  private implicit val system: ActorSystem = ActorSystem("RestServerSmokeSpec")
  import system.dispatcher

  override def afterAll(): Unit = Await.result(system.terminate(), 10.seconds)

  "The Pekko HTTP REST framework" should {
    "bind a RestComponent route and serve requests" in {
      val component = new RestComponent {
        override def route: Route = path("ping") { get { complete("pong") } }
      }
      val service = new RestService {
        protected[this] def apis: Seq[RestComponent] = Seq(component)
      }

      val binding = Await.result(
        Http().newServerAt("localhost", 0).bind(service.standardRoute), 10.seconds)
      try {
        val port = binding.localAddress.getPort
        val response = Await.result(
          Http().singleRequest(HttpRequest(uri = s"http://localhost:$port/ping")), 10.seconds)
        response.status shouldBe StatusCodes.OK
        Await.result(Unmarshal(response.entity).to[String], 10.seconds) shouldBe "pong"
      } finally {
        Await.result(binding.unbind(), 10.seconds)
      }
    }
  }
}
