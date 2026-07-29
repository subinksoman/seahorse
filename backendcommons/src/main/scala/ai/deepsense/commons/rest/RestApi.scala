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

import org.jclouds.http.HttpResponseException
import org.apache.pekko.http.scaladsl.marshallers.sprayjson.SprayJsonSupport
import org.apache.pekko.http.scaladsl.model.{StatusCode, StatusCodes}
import org.apache.pekko.http.scaladsl.server.{Directives, ExceptionHandler, MalformedRequestContentRejection, MissingHeaderRejection, RejectionHandler, Route, ValidationRejection}
import spray.json.DeserializationException
import spray.json.JsonParser.ParsingException

import ai.deepsense.commons.auth.directives.{AbstractAuthDirectives, AuthDirectives}
import ai.deepsense.commons.auth.exceptions.{NoRoleException, ResourceAccessDeniedException}
import ai.deepsense.commons.auth.usercontext.InvalidTokenException
import ai.deepsense.commons.exception.json.FailureDescriptionJsonProtocol
import ai.deepsense.commons.exception.{DeepSenseException, DeepSenseFailure, FailureCode, FailureDescription}
import ai.deepsense.commons.utils.Logging

trait RestApiAbstractAuth
  extends Directives
  with Logging
  with FailureDescriptionJsonProtocol
  with SprayJsonSupport {
  suite: AbstractAuthDirectives =>

  def exceptionHandler: ExceptionHandler = {
    ExceptionHandler {
      case e: HttpResponseException =>
        logger.error("Could not contact Keystone!", e)
        complete(StatusCodes.ServiceUnavailable)
      case e: NoRoleException =>
        logger.warn("A user does not have the expected role", e)
        complete(StatusCodes.Unauthorized)
      case e: ResourceAccessDeniedException =>
        logger.warn("A user tried to access a resource he does not have right to", e)
        complete(StatusCodes.NotFound)
      case e: InvalidTokenException =>
        logger.warn("Invalid token was send by the user", e)
        complete(StatusCodes.Unauthorized)
    }
  }

  val rejectionHandler: RejectionHandler = {
    def jsonFailureDescription(
        statusCode: StatusCode,
        description: FailureDescription): Route = {
      // SprayJsonSupport marshals FailureDescription as application/json (replaces the
      // Spray respondWithMediaType wrapper, which Pekko HTTP does not have).
      complete((statusCode, description))
    }

    def handleMalformedRequestContentRejection(
        message: String,
        cause: Option[Throwable]): Route = {

      val code = cause match {
        case Some(_: DeepSenseException)
             | Some(_: DeserializationException)
             | Some(_: NoSuchElementException)
             | Some(_: ParsingException)
             | Some(_: IllegalArgumentException) => StatusCodes.BadRequest
        case _ => StatusCodes.InternalServerError
      }

      val description = cause match {
        case Some(x: DeepSenseException) => x.failureDescription
        case Some(_: ParsingException) =>
          FailureDescription(
            DeepSenseFailure.Id.randomId,
            FailureCode.UnexpectedError,
            "Malformed request",
            Some(s"The request content does not seem to be JSON: $message"),
            Map())
        case Some(_: DeserializationException) | Some(_: IllegalArgumentException) =>
          FailureDescription(
            DeepSenseFailure.Id.randomId,
            FailureCode.UnexpectedError,
            "Malformed request",
            Some(s"The request content was malformed: $message"),
            Map())
        case _ =>
          FailureDescription(
            DeepSenseFailure.Id.randomId,
            FailureCode.UnexpectedError,
            "Internal Server Error",
            Some("The request could not be processed " +
              s"because of internal server error: $message"),
            Map())
      }

      val logMessage = s"MalformedRequestContentRejection (${description.id}): $message"
      cause match {
        case Some(_: DeepSenseException)
             | Some(_: DeserializationException)
             | Some(_: ParsingException)
             | Some(_: IllegalArgumentException) => logger.info(logMessage, cause.get)
        case Some(e) => logger.error(logMessage, cause.get)
        case _ => logger.info(logMessage)
      }

      jsonFailureDescription(code, description)
    }

    RejectionHandler.newBuilder()
      .handle {
        case MalformedRequestContentRejection(message, cause) =>
          // Pekko HTTP's MalformedRequestContentRejection carries a Throwable (not Option).
          handleMalformedRequestContentRejection(message, Option(cause))

        case MissingHeaderRejection(param) if param == TokenHeader =>
          logger.info(s"A request was rejected because did not contain '$TokenHeader' header")
          complete((StatusCodes.Unauthorized, s"Request is missing required header '$param'"))

        case ValidationRejection(rejectionMessage, cause) =>
          // Pekko HTTP raises unmarshalling require(...) failures as ValidationRejection (Spray
          // used MalformedRequestContentRejection); treat them as malformed content so the client
          // still receives a JSON FailureDescription rather than a bare 400.
          logger.info(s"A request was rejected because it was invalid: '$rejectionMessage'.")
          handleMalformedRequestContentRejection(rejectionMessage, cause)
      }
      .result()
  }
}

trait RestApi extends RestApiAbstractAuth with AuthDirectives
