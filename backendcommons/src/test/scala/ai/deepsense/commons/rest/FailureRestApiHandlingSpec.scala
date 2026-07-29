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

import org.apache.pekko.http.scaladsl.marshallers.sprayjson.SprayJsonSupport
import org.apache.pekko.http.scaladsl.model._
import org.apache.pekko.http.scaladsl.server.Route
import org.apache.pekko.http.scaladsl.testkit.ScalatestRouteTest
import spray.json.{DefaultJsonProtocol, JsObject}

import ai.deepsense.commons.StandardSpec

class FailureRestApiHandlingSpec
  extends StandardSpec
  with RestService
  with SprayJsonSupport
  with DefaultJsonProtocol
  with ScalatestRouteTest {

  override def apis: Seq[RestComponent] = {
    Seq(new FailureRestApi()(executor))
  }

  // Typed as RequestEntity (HttpEntity.Strict is one) so Post has an entity marshaller.
  val testEntity: RequestEntity = HttpEntity(ContentTypes.`application/json`, """{ "foo": "bar" }""")

  "RestApi" should {
    "answer BadRequest with Json error description" when {
      "entity json reader throws runtime exception" in {
        Post("/nullpointer", testEntity) ~> Route.seal(standardRoute) ~> check {
          shouldBeInternalServerError()
        }
      }
      "entity json reader throws deepsense exception" in {
        Post("/deepsense", testEntity) ~> Route.seal(standardRoute) ~> check {
          status should be(StatusCodes.BadRequest)
          shouldBeDeepsenseExceptionDescription()
        }
      }
      "entity json reader throws deserialization exception" in {
        Post("/deserialization", testEntity) ~> Route.seal(standardRoute) ~> check {
          shouldBeDeserializationExceptionDescription()
        }
      }
      "uploaded file is not JSON and cannot be deserialized" in {
        Post("/upload-ok", uploadFile("{; ; not json")) ~> Route.seal(standardRoute) ~> check {
          status should be(StatusCodes.BadRequest)
          shouldBeFailureDescription(
            responseAs[JsObject],
            code = Some("UnexpectedError"),
            title = Some("Malformed request"),
            message = Some("The request content does not seem to be JSON"))
        }
      }
      "uploaded entity's requirement failed" in {
        Post("/upload-ok", uploadFile("{     }")) ~> Route.seal(standardRoute) ~> check {
          shouldBeDeserializationExceptionDescription()
        }
      }
      "uploaded file reader throws deepsense exception" in {
        Post("/upload-deepsense", uploadFile()) ~> Route.seal(standardRoute) ~> check {
          shouldBeDeepsenseExceptionDescription()
        }
      }
      "uploaded file reader throws deserialization exception" in {

        Post("/upload-deserialization", uploadFile()) ~> Route.seal(standardRoute) ~> check {
          shouldBeDeserializationExceptionDescription()
        }
      }
      "uploaded file reader throws null exception" in {
        Post("/upload-nullpointer", uploadFile()) ~> Route.seal(standardRoute) ~> check {
          shouldBeInternalServerError()
        }
      }
    }
  }

  def uploadFile(data: String): Multipart.FormData = uploadFile(Some(data))
  def uploadFile(data: Option[String] = None): Multipart.FormData = {
    // Pekko HTTP multipart: a strict body part named "testFile" carrying the payload text.
    Multipart.FormData(
      Multipart.FormData.BodyPart.Strict(
        "testFile",
        HttpEntity(ContentTypes.`text/plain(UTF-8)`, data.getOrElse("{}"))))
  }

  def shouldBeDeserializationExceptionDescription(): Unit = {
    status should be(StatusCodes.BadRequest)
    shouldBeFailureDescription(
      responseAs[JsObject],
      code = Some("UnexpectedError"),
      title = Some("Malformed request"),
      message = Some("The request content was malformed:"))
  }

  def shouldBeDeepsenseExceptionDescription(): Unit = {
    status should be(StatusCodes.BadRequest)
    shouldBeFailureDescription(
      responseAs[JsObject],
      code = Some("UnexpectedError"),
      title = Some("Test Deepsense Exception"),
      message = Some("This is a test message from a deepsense exception"))
  }

  def shouldBeInternalServerError(): Unit = {
    status should be(StatusCodes.InternalServerError)
    shouldBeFailureDescription(
      responseAs[JsObject],
      code = Some("UnexpectedError"),
      title = Some("Internal Server Error"),
      message = Some("The request could not be processed because of internal server error:"))
  }

  def shouldBeFailureDescription(
      json: JsObject,
      id: Option[String] = None,
      code: Option[String] = None,
      title: Option[String] = None,
      message: Option[String] = None): Unit = {
    json.fields should contain key "id"
    json.fields should contain key "code"
    json.fields should contain key "message"
    json.fields should contain key "details"
    json.fields should contain key "title"

    def check(value: Option[String], key: String) = {
      value.foreach { v =>
        json.fields(key).convertTo[String] should startWith (v)
      }
    }

    check(id, "id")
    check(code, "code")
    check(message, "message")
    check(title, "title")
  }
}
