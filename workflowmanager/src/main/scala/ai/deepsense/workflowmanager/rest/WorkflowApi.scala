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

package ai.deepsense.workflowmanager.rest

import scala.concurrent.{ExecutionContext, Future}
import scala.concurrent.duration._
import scala.util.{Failure, Success, Try}

import com.google.inject.Inject
import com.google.inject.name.Named
import org.apache.commons.lang3.StringUtils
import org.apache.pekko.http.scaladsl.model.headers.{ContentDispositionTypes, RawHeader, `Content-Disposition`}
import org.apache.pekko.http.scaladsl.model.MediaTypes._
import org.apache.pekko.http.scaladsl.model._
import org.apache.pekko.http.scaladsl.marshalling.{Marshaller, ToEntityMarshaller}
import org.apache.pekko.http.scaladsl.unmarshalling.{FromEntityUnmarshaller, Unmarshal, Unmarshaller}
import spray.json._
import org.apache.pekko.http.scaladsl.server._
import org.apache.pekko.http.scaladsl.server.directives.Credentials

import ai.deepsense.commons.auth.directives._
import ai.deepsense.commons.auth.usercontext.TokenTranslator
import ai.deepsense.commons.json.envelope.{Envelope, EnvelopeJsonFormat}
import ai.deepsense.commons.models.ClusterDetails
import ai.deepsense.commons.rest.ClusterDetailsJsonProtocol._
import ai.deepsense.commons.rest.{Cors, RestApiAbstractAuth, RestComponent}
import ai.deepsense.commons.utils.Version
import ai.deepsense.graph.{CyclicGraphException, DeeplangGraph}
import ai.deepsense.models.json.graph.GraphJsonProtocol.GraphReader
import ai.deepsense.models.json.workflow._
import ai.deepsense.models.json.workflow.exceptions.WorkflowVersionException
import ai.deepsense.models.workflows._
import ai.deepsense.workflowmanager.exceptions._
import ai.deepsense.workflowmanager.model.{WorkflowDescription, WorkflowDescriptionJsonProtocol, WorkflowPreset, WorkflowPresetJsonProtocol}
import ai.deepsense.workflowmanager.{PresetService, WorkflowManagerProvider}


/**
 * Exposes Workflow Manager through a REST API.
 */
abstract class WorkflowApi @Inject() (
    val tokenTranslator: TokenTranslator,
    workflowManagerProvider: WorkflowManagerProvider,
    @Named("workflows.api.prefix") workflowsApiPrefix: String,
    @Named("reports.api.prefix") reportsApiPrefix: String,
    @Named("auth.user") authUser: String,
    @Named("auth.pass") authPass: String,
    private val presetService: PresetService,
    override val graphReader: GraphReader)
    (implicit ec: ExecutionContext)
  extends RestApiAbstractAuth
  with RestComponent
  with WorkflowJsonProtocol
  with WorkflowWithVariablesJsonProtocol
  with WorkflowWithResultsJsonProtocol
  with WorkflowPresetJsonProtocol
  with DOperationEnvelopesJsonProtocol
  with Cors
  with WorkflowVersionUtil {

  self: AbstractAuthDirectives =>

  override def currentVersion: Version = CurrentBuild.version

  assert(StringUtils.isNoneBlank(workflowsApiPrefix))
  private val workflowsPathPrefixMatcher = PathMatchers.separateOnSlashes(workflowsApiPrefix)
  private val reportsPathPrefixMatcher = PathMatchers.separateOnSlashes(reportsApiPrefix)
  private val workflowFileMultipartId = "workflowFile"
  private val workflowDownloadName = "workflow.json"

  // Pekko HTTP multipart is streamed; unmarshal the entity to Multipart.FormData, strictify it,
  // pick the named part and feed its text to the json reader (replaces Spray's
  // Unmarshaller.delegate[MultipartFormData, T] + selectFormPart).
  private def multipartUnmarshaller[T](read: String => T): FromEntityUnmarshaller[T] =
    Unmarshaller.withMaterializer[HttpEntity, T] { implicit ec => implicit mat => entity =>
      Unmarshal(entity).to[Multipart.FormData].flatMap { formData =>
        formData.toStrict(5.seconds).map { strict =>
          val stringData = strict.strictParts
            .filter(_.name == workflowFileMultipartId)
            .map(_.entity.data.utf8String)
            .mkString
          read(stringData)
        }
      }
    }

  private val WorkflowWithResultsUploadUnmarshaller: FromEntityUnmarshaller[WorkflowWithResults] =
    multipartUnmarshaller(s => versionedWorkflowWithResultsReader.read(JsonParser(s)))

  private val WorkflowUploadUnmarshaller: FromEntityUnmarshaller[Workflow] =
    multipartUnmarshaller(s => versionedWorkflowReader.read(JsonParser(s)))

  private val versionedWorkflowUnmarashaler: FromEntityUnmarshaller[Workflow] =
    sprayJsonUnmarshaller(versionedWorkflowReader)

  private val versionedWorkflowWithResultsUnmarashaler: FromEntityUnmarshaller[WorkflowWithResults] =
    sprayJsonUnmarshaller(versionedWorkflowWithResultsReader)

  private val workflowDescriptionUnmarashaler: FromEntityUnmarshaller[WorkflowDescription] =
    sprayJsonUnmarshaller(WorkflowDescriptionJsonProtocol.workflowDescriptionJsonFormat)

  implicit private val envelopeWorkflowIdJsonFormat =
    new EnvelopeJsonFormat[Workflow.Id]("workflowId")

  private val presetPathPrefixMatcher = PathMatchers.separateOnSlashes("v1/presets")
  def respondWithPresetId(presetId: Long) =
    respondWithHeader(RawHeader("Location", presetId.toString))

  def route: Route = {
    cors {
      handleRejections(rejectionHandler) {
        handleExceptions(exceptionHandler) {
          basicAuth { _ =>
            path("") {
              get {
                complete("Workflow Manager")
              }
            } ~
            pathPrefix(presetPathPrefixMatcher) {
              path(LongNumber) { presetId =>
                get {
                  // Pekko's Option marshaller renders None as an empty 200; map None -> 404 while
                  // preserving the Some(_) marshalling (Spray's Option marshaller did this).
                  onSuccess(presetService.getPreset(presetId)) {
                    case None => complete(StatusCodes.NotFound)
                    case result => complete(result)
                  }
                } ~
                delete {
                  complete {
                    presetService.removePreset(presetId)
                    StatusCodes.OK
                  }
                } ~
                post {
                  entity(as[ClusterDetails]) { request =>
                    val preset = presetService.updatePreset(presetId, request)
                    onSuccess(preset) {
                      case _ => complete(StatusCodes.OK)
                    }
                  }
                }
              } ~
              pathEndOrSingleSlash {
                get {
                  complete(presetService.listPresets())
                } ~
                post {
                  entity(as[ClusterDetails]) { request =>
                    val preset = presetService.createPreset(request)
                    onSuccess(preset) {
                      case newPresetId => respondWithPresetId(newPresetId) {
                        complete(StatusCodes.Created)
                      }
                    }
                  }
                }
              }
            } ~
            pathPrefix(workflowsPathPrefixMatcher) {
              path(JavaUUID) { workflowId =>
                get {
                  withUserId { userContext =>
                    onComplete(workflowManagerProvider.forContext(userContext).get(workflowId)) {
                      case Failure(exception) =>
                        logger.info("Get Workflow & results failed", exception)
                        failWith(exception)
                      case Success(None) =>
                        logger.info("Get Workflow & results: not found")
                        complete(StatusCodes.NotFound)
                      case Success(workflowWithResults) =>
                        logger.info("Get Workflow & results")
                        complete(workflowWithResults)
                    }
                  }
                } ~
                put {
                  withUserId { userContext =>
                    implicit val unmarshaller = versionedWorkflowWithResultsUnmarashaler
                    entity(as[WorkflowWithResults]) {
                      workflowWithResults =>
                        onComplete(workflowManagerProvider
                          .forContext(userContext)
                          .updateStructAndStates(workflowId, workflowWithResults)) {
                          case Failure(exception) =>
                            logger.info("Workflow & results update failed", exception)
                            failWith(exception)
                          case Success(_) =>
                            logger.info("Workflow & results updated")
                            complete(StatusCodes.OK)
                        }
                    }
                  }
                } ~
                delete {
                  withUserId { userContext =>
                    onSuccess(workflowManagerProvider.forContext(userContext).delete(workflowId)) {
                      case true => complete(StatusCodes.OK)
                      case false => complete(StatusCodes.NotFound)
                    }
                  }
                }
              } ~
              path(JavaUUID / "info") { workflowId =>
                get {
                  withUserId { userContext =>
                    onComplete(workflowManagerProvider.forContext(userContext).getInfo(workflowId)) {
                      case Failure(exception) =>
                        logger.info("Get Workflow info failed", exception)
                        failWith(exception)
                      case Success(workflow) =>
                        logger.info("Get Workflow info")
                        complete(workflow)
                    }
                  }
                }
              } ~
              pathPrefix(JavaUUID / "download") { workflowId =>
                get {
                  val exportDatasource = parameter(Symbol("export-datasources").as[Boolean])
                  (withUserId & exportDatasource) { (userContext, exportDatasources) =>
                    val futureWorkflow =
                      workflowManagerProvider.forContext(userContext).download(workflowId, exportDatasources)
                    onSuccess(futureWorkflow) { w =>
                      // SprayJsonSupport already marshals as application/json, so the Spray
                      // respondWithMediaType wrapper is dropped; headers go into the complete tuple.
                      w.map(workflowWithVariables =>
                        complete((
                          StatusCodes.OK,
                          scala.collection.immutable.Seq(
                            `Content-Disposition`(
                              ContentDispositionTypes.attachment,
                              Map("filename" -> workflowFileName(workflowWithVariables)))),
                          workflowWithVariables))
                      ).getOrElse(complete(StatusCodes.NotFound))
                    }
                  }
                }
              } ~
              path(JavaUUID / "clone") { workflowId =>
                post {
                  withUserContext { userContext =>
                    implicit val unmarshaller = workflowDescriptionUnmarashaler
                    entity(as[WorkflowDescription]) { workflowDescription =>
                      onSuccess(workflowManagerProvider.forContext(userContext)
                        .clone(workflowId, workflowDescription)) {
                        case Some(workflowWithVariables) =>
                          val envelopedWorkflowId = Envelope(workflowWithVariables.id)
                          complete(StatusCodes.Created, envelopedWorkflowId)
                        case None =>
                          complete(StatusCodes.NotFound)
                      }
                    }
                  }
                }
              } ~
              path(JavaUUID / "preset") { workflowId =>
                get {
                  withUserId { userContext =>
                    onSuccess(presetService.getWorkflowsPreset(workflowId)) {
                      case None => complete(StatusCodes.NotFound)
                      case result => complete(result)
                    }
                  }
                } ~
                post {
                  withUserId { userContext =>
                    entity(as[WorkflowPreset]) {
                      workflowPreset => {
                        if (workflowId != workflowPreset.id.value) {
                          logger.info("workflowId in URI and workflow preset are different")
                          complete(StatusCodes.BadRequest)
                        } else {
                          onComplete(presetService.saveWorkflowsPreset(
                            userContext, workflowId, workflowPreset)) {
                            case Failure(exception) =>
                              logger.info("Workflow & preset update failed", exception)
                              failWith(exception)
                            case Success(_) =>
                              complete(StatusCodes.OK)
                          }
                        }
                      }
                    }
                  }
                }
              } ~
              path("upload") {
                post {
                  withUserContext {
                    userContext => {
                      implicit val unmarshaller = WorkflowUploadUnmarshaller
                      entity(as[Workflow]) { workflow =>
                        val futureWorkflowId =
                          workflowManagerProvider.forContext(userContext).create(workflow)
                        onSuccess(futureWorkflowId) { workflowId =>
                          val envelopedWorkflowId = Envelope(workflowId)
                          complete(StatusCodes.Created, envelopedWorkflowId)
                        }
                      }
                    }
                  }
                }
              } ~
              path(JavaUUID / "notebook" / JavaUUID) { (workflowId, nodeId) =>
                get {
                  withUserId { userContext =>
                    onSuccess(workflowManagerProvider.forContext(userContext)
                      .getNotebook(workflowId, nodeId)) {
                      case None => complete(StatusCodes.NotFound)
                      case result => complete(result)
                    }
                  }
                } ~
                post {
                  withUserContext { userContext =>
                    entity(as[String]) { notebook =>
                      onSuccess(workflowManagerProvider.forContext(userContext)
                        .saveNotebook(workflowId, nodeId, notebook)) {
                        // Future[Unit] => Directive0 in Pekko HTTP, so the inner block takes no arg.
                        complete(StatusCodes.Created)
                      }
                    }
                  }
                }
              } ~
              path(JavaUUID / "notebook" / JavaUUID / "copy" / JavaUUID) {
                (workflowId, nodeId, destinationNodeId) =>
                  post {
                    withUserContext { userContext =>
                      onSuccess(workflowManagerProvider.forContext(userContext)
                        .copyNotebook(workflowId, nodeId, destinationNodeId)) {
                        // Future[Unit] => Directive0 in Pekko HTTP, so the inner block takes no arg.
                        complete(StatusCodes.Created)
                      }
                    }
                  }
              } ~
              pathEndOrSingleSlash {
                get {
                  withUserId { userContext =>
                    onSuccess(workflowManagerProvider.forContext(userContext).list()) { workflows =>
                      complete(StatusCodes.OK, workflows)
                    }
                  }
                } ~
                post {
                  withUserContext { userContext =>
                    implicit val format = versionedWorkflowUnmarashaler
                    entity(as[Workflow]) { workflow =>
                      onSuccess(workflowManagerProvider
                        .forContext(userContext).create(workflow)) { workflowId =>
                        complete(StatusCodes.Created, Envelope(workflowId))
                      }
                    }
                  }
                }
              }
            } ~
            pathPrefix(reportsPathPrefixMatcher) {
              path(JavaUUID) { workflowId =>
                put {
                  withUserId { userContext =>
                    entity(as[ExecutionReport]) {
                      executioReport =>
                        onComplete(
                          workflowManagerProvider
                          .forContext(userContext)
                          .updateStates(workflowId, executioReport)) {
                          case Failure(exception) =>
                            logger.info("updateStates failed", exception)
                            failWith(exception)
                          case Success(_) =>
                            logger.info("updateStates succeeded")
                            complete(StatusCodes.OK)
                        }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  implicit def checkEither[T : ToEntityMarshaller](x: Future[Option[Either[String, T]]]): Route = {
    onSuccess(x) {
      case Some(Left(s)) => complete(StatusCodes.Conflict, s)
      case Some(Right(r)) => complete(StatusCodes.OK, r)
      case None => complete(StatusCodes.NotFound)
    }
  }

  // Pekko HTTP: exceptionHandler takes no implicit LoggingContext, and handlers compose via
  // withFallback (Spray used PartialFunction.orElse).
  override def exceptionHandler: ExceptionHandler = {
    ExceptionHandler {
        case e: WorkflowNotFoundException =>
          complete(StatusCodes.NotFound, e.failureDescription)
        case e: WorkflowRunningException =>
          complete(StatusCodes.Conflict, e.failureDescription)
        case e: FileNotFoundException =>
          complete(StatusCodes.NotFound, e.failureDescription)
        case e: CyclicGraphException =>
          complete(StatusCodes.BadRequest, e.failureDescription)
        case e: WorkflowVersionException =>
          complete(StatusCodes.BadRequest, e.failureDescription)
        case e: WorkflowOwnerMismatchException =>
          complete(StatusCodes.Unauthorized, e.failureDescription)
    }.withFallback(super.exceptionHandler)
  }

  // Pekko HTTP: authenticateBasic takes a synchronous Credentials => Option[T] authenticator
  // (replaces Spray's BasicAuth(userPassAuthenticator, realm)). Credentials.Provided.verify
  // does the constant-time password comparison.
  private def basicAuth: Directive1[Unit] =
    authenticateBasic(realm = "Workflow Manager", authenticator = userPassAuthenticator)

  private def userPassAuthenticator(credentials: Credentials): Option[Unit] =
    credentials match {
      case p @ Credentials.Provided(user) if user == authUser && p.verify(authPass) => Some(())
      case _ => None
    }

  private def workflowFileName(workflow: WorkflowWithVariables): String = {
    val thirdPartyData = workflow.thirdPartyData
    // TODO DS-1486 Add "name" and "description" fields to Workflow
    Try(thirdPartyData
      .fields("gui").asJsObject
      .fields("name").asInstanceOf[JsString].value) match {
      case Success(name) => name.replaceAll("[^a-zA-Z0-9.-]", "_") + ".json"
      case Failure(_) => workflowDownloadName
    }
  }
}

class SecureWorkflowApi @Inject() (
  tokenTranslator: TokenTranslator,
  workflowManagerProvider: WorkflowManagerProvider,
  @Named("workflows.api.prefix") workflowsApiPrefix: String,
  @Named("reports.api.prefix") reportsApiPrefix: String,
  @Named("auth.user") authUser: String,
  @Named("auth.pass") authPass: String,
  private val presetService: PresetService,
  override val graphReader: GraphReader)
  (implicit ec: ExecutionContext)
  extends WorkflowApi(
    tokenTranslator,
    workflowManagerProvider,
    workflowsApiPrefix,
    reportsApiPrefix,
    authUser,
    authPass,
    presetService,
    graphReader)
  with AuthDirectives

class InsecureWorkflowApi @Inject() (
  tokenTranslator: TokenTranslator,
  workflowManagerProvider: WorkflowManagerProvider,
  @Named("workflows.api.prefix") workflowsApiPrefix: String,
  @Named("reports.api.prefix") reportsApiPrefix: String,
  @Named("auth.user") authUser: String,
  @Named("auth.pass") authPass: String,
  private val presetService: PresetService,
  override val graphReader: GraphReader)
  (implicit ec: ExecutionContext)
  extends WorkflowApi(
    tokenTranslator,
    workflowManagerProvider,
    workflowsApiPrefix,
    reportsApiPrefix,
    authUser,
    authPass,
    presetService,
    graphReader)
  with InsecureAuthDirectives
