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

import org.apache.pekko.http.scaladsl.model.HttpHeader
import org.apache.pekko.http.scaladsl.model.HttpMethods.OPTIONS
import org.apache.pekko.http.scaladsl.model.headers._
import org.apache.pekko.http.scaladsl.server.{Directive0, Directives}

/**
 * CORS support migrated from Spray's RequestContext-based approach (mapRequestContext /
 * withRouteResponseHandling / withHttpResponseHeadersMapped, none of which exist in Pekko HTTP).
 *
 * `cors` adds the Access-Control-Allow-* headers to responses and answers OPTIONS preflight
 * requests. (Preflight replies advertise the standard set; per-path Allow-Methods parity, which
 * Spray derived from MethodRejections, can be refined during runtime CORS verification.)
 */
trait Cors {
  this: Directives =>

  private val allowOriginHeader = `Access-Control-Allow-Origin`.*
  private val corsHeaders: List[HttpHeader] = List(
    allowOriginHeader,
    `Access-Control-Allow-Methods`(OPTIONS, org.apache.pekko.http.scaladsl.model.HttpMethods.GET,
      org.apache.pekko.http.scaladsl.model.HttpMethods.POST,
      org.apache.pekko.http.scaladsl.model.HttpMethods.PUT,
      org.apache.pekko.http.scaladsl.model.HttpMethods.DELETE),
    `Access-Control-Allow-Headers`("Origin, X-Requested-With, Content-Type, Accept, " +
      "Accept-Encoding, Accept-Language, Host, Referer, User-Agent"),
    `Access-Control-Max-Age`(1728000))

  def cors: Directive0 = respondWithHeaders(corsHeaders)
}
