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

package ai.deepsense.deeplang.doperations

import java.io.{ByteArrayInputStream, InputStream, PrintWriter, StringWriter}

import scala.concurrent.Await
import scala.concurrent.duration.Duration
import scala.reflect.runtime.{universe => ru}

import ai.deepsense.deeplang.documentation.OperationDocumentation
import ai.deepsense.deeplang.doperables.dataframe.DataFrame
import ai.deepsense.deeplang.params.choice.{Choice, MultipleChoiceParam}
import ai.deepsense.deeplang.params.{Params, StringParam}
import ai.deepsense.deeplang.{DOperation1To0, ExecutionContext}


abstract class Notebook()
  extends DOperation1To0[DataFrame] with Params with OperationDocumentation {

  import Notebook._

  // TODO: invent a better implementation of nested parameters
  val shouldExecuteParam = MultipleChoiceParam[SendEmailChoice](
    name = "execute notebook",
    description = Some("Should the Notebook cells be run when this operation is executed?")
  )
  setDefault(shouldExecuteParam, Set.empty: Set[SendEmailChoice])

  def getShouldExecute: Set[SendEmailChoice] = $(shouldExecuteParam)

  def setShouldExecute(emailChoice: Set[SendEmailChoice]): this.type =
    set(shouldExecuteParam, emailChoice)

  override val specificParams: Array[ai.deepsense.deeplang.params.Param[_]] =
    Array(shouldExecuteParam)

  val notebookType: String

  def headlessExecution(context: ExecutionContext) : Unit = {

    context.notebooksClient.map(_.as.dispatcher).foreach { implicit ec =>
      for {
        _ <- getShouldExecute
        generatedNotebookFutOpt = context.notebooksClient.map(_.generateAndPollNbData(notebookType))
        streamFut <- generatedNotebookFutOpt.map(_.map(new ByteArrayInputStream(_)))
      } {
        logger.info(s"Generating notebook data")

       /* streamFut.onFailure {
          case t =>
            val stackWriter = new StringWriter()
            t.printStackTrace(new PrintWriter(stackWriter))
            sendMail("Notebook execution failed", "Sorry! The execution of your notebook has failed.\n" +
              stackWriter.toString, context, None)
        }*/
        
streamFut.failed.foreach { t =>
  val stackWriter = new StringWriter()
  t.printStackTrace(new PrintWriter(stackWriter))
  val trace =
    s"""<pre style="margin:0;background:#f7fafc;border:1px solid #edf0f2;border-radius:6px;padding:12px;font-size:12px;color:#4a5568;overflow:auto;max-height:320px;white-space:pre-wrap;word-break:break-word;">${htmlEscape(stackWriter.toString)}</pre>"""
  sendMail(
    "Notebook execution failed",
    emailHtml(
      "Notebook execution failed",
      "Sorry &mdash; the execution of your notebook has failed. The error details are below.",
      Some(trace)),
    context,
    None
  )
}




        Await.result(for {
          stream <- streamFut
        } yield {
          sendMail("Notebook execution result",
            emailHtml(
              "Notebook execution result &#10003;",
              "Your notebook has finished executing. The result is attached to this email as " +
                s"<strong>${Notebook.notebookDataFilename}</strong>.",
              None),
            context,
            Some((stream, Some(Notebook.notebookDataMimeType)))
          )

        }, Duration.Inf)
      }
    }
  }

  private def sendMail(subject: String,
      body: String,
      context: ExecutionContext,
      attachment: Option[(InputStream, Option[String])]
  ): Unit = {
    for {
      shouldExecute <- getShouldExecute
      mailAddress <- shouldExecute.getSendEmail
      sender <- context.emailSender
      recipients = mailAddress.getEmailAddress.split(",").map(_.trim).filter(_.nonEmpty).toSeq
      if recipients.nonEmpty
      msg = sender.createHtmlMessage(subject, body, recipients)
      msgWithAttachment = attachment.map {
        case (stream, contentTypeOpt) =>
          sender.attachAttachment(msg, stream, Notebook.notebookDataFilename, contentTypeOpt)
      }.getOrElse(msg)
    } {
      sender.sendEmail(msgWithAttachment).foreach(throw _)
    }
  }

  // Standard 6D Analytical Engine HTML email (matches the scheduled-run notification style).
  private def emailHtml(heading: String, message: String, detailHtml: Option[String]): String =
    s"""<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
        <tr><td style="background:#0197c8;padding:20px 28px;">
          <span style="color:#ffffff;font-size:20px;font-weight:bold;letter-spacing:.3px;">6D Analytical Engine</span>
        </td></tr>
        <tr><td style="padding:28px;">
          <h2 style="margin:0 0 14px;color:#2f4050;font-size:18px;">$heading</h2>
          <p style="margin:0 0 16px;color:#4a5568;font-size:14px;line-height:1.6;">$message</p>
          ${detailHtml.getOrElse("")}
        </td></tr>
        <tr><td style="background:#f4f6f8;padding:16px 28px;color:#a0aec0;font-size:12px;">
          6D Analytical Engine &middot; automated notification &mdash; please do not reply.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""

  private def htmlEscape(s: String): String =
    s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

  @transient
  override lazy val tTagTI_0: ru.TypeTag[DataFrame] = ru.typeTag[DataFrame]
}


object Notebook {
  val notebookDataMimeType = "text/html"
  val notebookDataFilename = "notebook.html"

  sealed trait SendEmailChoice extends Choice {
    override val name = ""

    val sendEmailParam = MultipleChoiceParam[EmailAddressChoice](
      name = "send e-mail report",
      description = Some("Should the e-mail report be sent after Notebook execution?")
    )
    setDefault(sendEmailParam, Set.empty: Set[EmailAddressChoice])

    def getSendEmail: Set[EmailAddressChoice] = $(sendEmailParam)

    def setSendEmail(emailAddressChoice: Set[EmailAddressChoice]): this.type =
      set(sendEmailParam, emailAddressChoice)

    override val params: Array[ai.deepsense.deeplang.params.Param[_]] =
      Array(sendEmailParam)

    override val choiceOrder: List[Class[_ <: Choice]] = List(SendEmailChoice.getClass)
  }

  object SendEmailChoice extends SendEmailChoice


  sealed trait EmailAddressChoice extends Choice {
    override val name = ""

    val emailAddressParam = StringParam(
      name = "email address",
      description = Some("The address to which the report will be sent.")
    )

    def getEmailAddress: String = $(emailAddressParam)

    def setEmailAddress(address: String): this.type =
      set(emailAddressParam, address)

    override val params: Array[ai.deepsense.deeplang.params.Param[_]] =
      Array(emailAddressParam)

    override val choiceOrder: List[Class[_ <: Choice]] = List(EmailAddressChoice.getClass)
  }

  object EmailAddressChoice extends EmailAddressChoice
}


