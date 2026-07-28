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

package ai.deepsense.commons.rest.client

import java.net.URL
import java.util.UUID

import scala.concurrent.{ExecutionContext, Future}

import org.apache.pekko.http.scaladsl.Http
import org.apache.pekko.http.scaladsl.model.headers.{HttpCredentials, RawHeader}
import org.apache.pekko.http.scaladsl.model.{HttpRequest, HttpResponse}
import org.apache.pekko.http.scaladsl.unmarshalling.{FromResponseUnmarshaller, Unmarshal}

// Migrated from Spray's actor-IO client (IO(Http) ? HostConnectorSetup + sendReceive
// pipeline) to Pekko HTTP's Http().singleRequest. Per-request headers/credentials are
// added directly to the HttpRequest instead of via the ~> RequestTransformer pipeline.
trait RestClient extends RestClientImplicits {
  import RestClient._

  def apiUrl: URL
  def userId: Option[UUID]
  def userName: Option[String]
  def credentials: Option[HttpCredentials]
  implicit override val ctx: ExecutionContext = as.dispatcher

  private def decorate(req: HttpRequest): HttpRequest = {
    val withUserId = userId.foldLeft(req) { (r, id) =>
      r.addHeader(RawHeader(UserIdHeader, id.toString))
    }
    val withUserName = userName.foldLeft(withUserId) { (r, name) =>
      r.addHeader(RawHeader(UserNameHeader, name))
    }
    credentials.foldLeft(withUserName) { (r, creds) => r.addCredentials(creds) }
  }

  def fetchResponse[U : FromResponseUnmarshaller](req: HttpRequest): Future[U] = {
    fetchHttpResponse(req).flatMap(resp => Unmarshal(resp).to[U])
  }

  def fetchHttpResponse(req: HttpRequest): Future[HttpResponse] = {
    Http()(as).singleRequest(decorate(req))
  }

  def endpointPath(endpoint: String): String = {
    new URL(apiUrl, endpoint).getFile
  }
}


object RestClient {
  val UserIdHeader = "X-Seahorse-UserId"
  val UserNameHeader = "X-Seahorse-UserName"
}
