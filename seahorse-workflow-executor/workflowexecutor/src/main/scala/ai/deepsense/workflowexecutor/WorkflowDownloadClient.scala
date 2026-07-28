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

package ai.deepsense.workflowexecutor

import scala.concurrent.Future

import org.apache.pekko.actor.ActorSystem
import org.apache.pekko.http.scaladsl.Http
import org.apache.pekko.http.scaladsl.client.RequestBuilding.Get
import org.apache.pekko.http.scaladsl.model.{HttpResponse, StatusCodes}
import org.apache.pekko.http.scaladsl.unmarshalling.Unmarshal

import ai.deepsense.commons.utils.Logging
import ai.deepsense.workflowexecutor.exception.UnexpectedHttpResponseException

class WorkflowDownloadClient(
    val address: String,
    val path: String,
    val timeout: Int)
  extends Logging {

  val downloadUrl = (workflowId: String) =>
    s"$address/$path/$workflowId/download"

  def downloadWorkflow(workflowId: String): Future[String] = {

    logger.info(s"Downloading workflow $workflowId...")

    implicit val system = ActorSystem()
    import system.dispatcher

    // Pekko HTTP replaces Spray's IO(Http) + sendReceive pipeline. The response entity is
    // streamed, so it must be consumed (Unmarshal to String) before the result completes.
    val result = Http()(system)
      .singleRequest(Get(downloadUrl(workflowId)))
      .flatMap(handleResponse)

    result.onComplete { _ => system.terminate() }
    result
  }

  private def handleResponse(response: HttpResponse)(
      implicit ec: scala.concurrent.ExecutionContext,
      mat: org.apache.pekko.stream.Materializer): Future[String] = {
    Unmarshal(response.entity).to[String].flatMap { body =>
      response.status match {
        case StatusCodes.OK => Future.successful(body)
        case _ => Future.failed(
          UnexpectedHttpResponseException("Workflow download failed", response.status, body))
      }
    }
  }
}
