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

import org.apache.pekko.http.scaladsl.model.StatusCodes
import org.apache.pekko.http.scaladsl.server.Directives._
import org.apache.pekko.http.scaladsl.server.{ExceptionHandler, MissingQueryParamRejection, RejectionHandler, Route}

/**
 * Builds the combined API route from the registered RestComponents.
 *
 * Pekko HTTP is route-bound (no HttpService actor / runRoute), so this trait just exposes a
 * `standardRoute`; RestModule provides it and RestServer binds it. Request-timeout responses are
 * configured via pekko.http.server.request-timeout rather than a timeoutRoute.
 */
trait RestService {
  /**
   * @return List of apis to include in route
   */
  protected[this] def apis: Seq[RestComponent]

  lazy val standardRoute: Route =
    handleRejections(rejectionHandler) {
      handleExceptions(exceptionHandler) {
        apis.tail.foldLeft(apis.head.route) { (chain, next) =>
          chain ~ next.route
        }
      }
    }

  private val exceptionHandler: ExceptionHandler = {
    ExceptionHandler {
      case e: ExceptionWithStatus =>
        complete((e.statusCode, e.msg))
    }
  }

  private val rejectionHandler: RejectionHandler = {
    RejectionHandler.newBuilder()
      .handle {
        case MissingQueryParamRejection(param) =>
          complete((StatusCodes.BadRequest, s"Request is missing required query parameter '$param'"))
      }
      .result()
  }
}
