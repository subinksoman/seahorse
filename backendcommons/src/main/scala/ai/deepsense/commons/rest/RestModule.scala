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

import scala.collection.JavaConverters._

import com.google.inject.name.Named
import com.google.inject.{AbstractModule, Provides, Singleton}
import org.apache.pekko.http.scaladsl.server.Route

/**
 * Configures RestServer internals.
 *
 * Pekko HTTP is route-bound, so instead of creating a RestServiceActor via a supervisor and
 * exposing an ActorRef, this provides the combined API Route built from the registered
 * RestComponents. RestServer binds that Route.
 */
class RestModule extends AbstractModule {
  override def configure(): Unit = {
    bind(classOf[RestServer])
  }

  @Provides
  @Singleton
  @Named("ApiRoute")
  def provideApiRoute(apiSet: java.util.Set[RestComponent]): Route = {
    new RestService {
      protected[this] def apis: Seq[RestComponent] = apiSet.asScala.toSeq
    }.standardRoute
  }
}
