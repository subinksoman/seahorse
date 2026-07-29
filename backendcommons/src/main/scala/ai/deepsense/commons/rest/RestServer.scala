/**
 * Copyright 2015 deepsense.ai (CodiLime, Inc)
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

import com.google.inject.Inject
import com.google.inject.name.Named
import org.apache.pekko.actor.ActorSystem
import org.apache.pekko.http.scaladsl.Http
import org.apache.pekko.http.scaladsl.server.Route

/**
 * RestServer binds the combined API Route to the HTTP server.
 * Migrated from Spray's actor-bound model (IO(Http) ! Http.Bind(actor)) to Pekko HTTP's
 * route-bound model (Http().newServerAt(host, port).bind(route)).
 */
class RestServer @Inject()(
  @Named("server.host") host: String,
  @Named("server.port") port: Int,
  @Named("ApiRoute") route: Route
) (implicit actorSystem: ActorSystem) {
  def start(): Unit = {
    Http().newServerAt(host, port).bind(route)
  }
}
