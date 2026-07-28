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

import org.apache.pekko.actor.{Actor, Props}
import org.apache.pekko.pattern.pipe
import org.apache.pekko.http.scaladsl.Http
import org.apache.pekko.http.scaladsl.client.RequestBuilding.{Get, Put, addCredentials, addHeader}
import org.apache.pekko.http.scaladsl.marshallers.sprayjson.SprayJsonSupport
import org.apache.pekko.http.scaladsl.model.headers.BasicHttpCredentials
import org.apache.pekko.http.scaladsl.model.{HttpRequest, HttpResponse, StatusCodes}
import org.apache.pekko.http.scaladsl.unmarshalling.Unmarshal
import spray.json._

import ai.deepsense.commons.utils.Logging
import ai.deepsense.models.json.graph.GraphJsonProtocol.GraphReader
import ai.deepsense.models.json.workflow.WorkflowWithResultsJsonProtocol
import ai.deepsense.models.workflows.{ExecutionReport, Workflow, WorkflowWithResults}
import ai.deepsense.workflowexecutor.WorkflowManagerClientActorProtocol.{GetWorkflow, Request, SaveState, SaveWorkflow}
import ai.deepsense.workflowexecutor.exception.UnexpectedHttpResponseException

class WorkflowManagerClientActor(
    val workflowOwnerId: String,
    val wmUsername: String,
    val wmPassword: String,
    val workflowApiAddress: String,
    val workflowApiPrefix: String,
    val reportsApiPrefix: String,
    override val graphReader: GraphReader)
  extends Actor
  with WorkflowWithResultsJsonProtocol
  with SprayJsonSupport
  with Logging {

  import context.dispatcher
  private implicit val system = context.system

  private val SeahorseUserIdHeaderName = "X-Seahorse-UserId"

  override def receive: Receive = {
    case r: Request => r match {
      case GetWorkflow(workflowId) => getWorkflow(workflowId) pipeTo sender()
      case SaveWorkflow(workflow) => saveWorkflowWithState(workflow) pipeTo sender()
      case SaveState(workflowId, state) => saveState(workflowId, state) pipeTo sender()
    }
    case message => unhandled(message)
  }

  private val downloadWorkflowUrl = (workflowId: Workflow.Id) =>
    s"$workflowApiAddress/$workflowApiPrefix/$workflowId"
  private val saveWorkflowWithStateUrl = (workflowId: Workflow.Id) =>
    s"$workflowApiAddress/$workflowApiPrefix/$workflowId"
  private val saveStateUrl = (workflowId: Workflow.Id) =>
    s"$workflowApiAddress/$reportsApiPrefix/$workflowId"

  private def getWorkflow(workflowId: Workflow.Id): Future[Option[WorkflowWithResults]] = {
    val url: String = downloadWorkflowUrl(workflowId)
    logger.debug("GET workflow URL: {}", url)
    send(Get(url)).flatMap(handleGetResponse)
  }

  private def saveWorkflowWithState(workflow: WorkflowWithResults): Future[Unit] = {
    send(Put(saveWorkflowWithStateUrl(workflow.id), workflow)).flatMap(handleUploadResponse)
  }

  private def saveState(workflowId: Workflow.Id, state: ExecutionReport): Future[Unit] = {
    send(Put(saveStateUrl(workflowId), state)).flatMap(handleUploadResponse)
  }

  // Pekko HTTP entities are streamed, so responses are unmarshalled/consumed asynchronously.
  private def handleGetResponse(response: HttpResponse): Future[Option[WorkflowWithResults]] = {
    response.status match {
      case StatusCodes.OK =>
        Unmarshal(response.entity).to[String].map(body =>
          Some(body.parseJson.convertTo[WorkflowWithResults]))
      case StatusCodes.NotFound =>
        response.entity.discardBytes()
        Future.successful(None)
      case _ =>
        Unmarshal(response.entity).to[String].flatMap(body => Future.failed(
          UnexpectedHttpResponseException("Workflow download failed", response.status, body)))
    }
  }

  private def handleUploadResponse(response: HttpResponse): Future[Unit] = {
    if (response.status.isSuccess()) {
      response.entity.discardBytes()
      Future.successful(())
    } else {
      Unmarshal(response.entity).to[String].flatMap(body => Future.failed(
        UnexpectedHttpResponseException("Upload failed", response.status, body)))
    }
  }

  private val addUserIdHeader: HttpRequest => HttpRequest =
    addHeader(SeahorseUserIdHeaderName, workflowOwnerId)

  private val addWMCredentials: HttpRequest => HttpRequest =
    addCredentials(BasicHttpCredentials(wmUsername, wmPassword))

  private def send(req: HttpRequest): Future[HttpResponse] =
    Http().singleRequest(addWMCredentials(addUserIdHeader(req)))
}

object WorkflowManagerClientActor {
  def props(
      workflowOwnerId: String,
      wmUsername: String,
      wmPassword: String,
      workflowApiAddress: String,
      workflowApiPrefix: String,
      reportsApiPrefix: String,
      graphReader: GraphReader): Props = {
    Props(
      new WorkflowManagerClientActor(
        workflowOwnerId,
        wmUsername: String,
        wmPassword: String,
        workflowApiAddress,
        workflowApiPrefix,
        reportsApiPrefix,
        graphReader))
  }
}

object WorkflowManagerClientActorProtocol {

  sealed trait Request

  case class GetWorkflow(workflowId: Workflow.Id) extends Request
  case class SaveWorkflow(workflow: WorkflowWithResults) extends Request
  case class SaveState(workflowId: Workflow.Id, state: ExecutionReport) extends Request
}
