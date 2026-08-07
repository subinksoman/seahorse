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

package ai.deepsense.seahorse.scheduling.schedule

import java.util.UUID

import scala.concurrent.Future

import ai.deepsense.commons.utils.LoggerForCallerClass
import ai.deepsense.models.workflows.{Workflow, WorkflowInfo}

class RunWorkflowJob extends WorkflowJob {
  import scala.concurrent.ExecutionContext.Implicits.global

  override val logger = LoggerForCallerClass()

  override def runWorkflow(workflowId: String, sendReportToEmail: String, presetId: Long): Future[Unit] = {
    logger.info(s"Starting workflow $workflowId scheduled execution on cluster $presetId with email " +
      s"to $sendReportToEmail afterwards.")

    // TODO Rewrite using queue/db
    // TODO For now, it's not very reliable - if something fails in the middle, whole thing fails to finish.
    val startedAt = java.time.Instant.now()
    val idToClone = Workflow.Id(UUID.fromString(workflowId))
    for {
      workflowInfo <- WorkflowsApi.getWorkflowInfo(idToClone)
      clonedId <- WorkflowsApi.cloneWorkflow(idToClone, workflowInfo)
      presetClusterDetailsOpt <- PresetsApi.fetchPreset(presetId)
      presetClusterDetails = presetClusterDetailsOpt
        .getOrElse(throw new IllegalArgumentException(s"Preset $presetId doesn't exist any more."))
      () <- SessionsApi.startSession(clonedId, presetClusterDetails)
      () <- SessionsApi.runWorkflow(clonedId)
      () <- SessionsApi.deleteSession(clonedId)
      () <- sendEmail(clonedId, idToClone, presetId, startedAt, sendReportToEmail, workflowInfo)
    } yield ()
  }

  private[this] val timeFmt =
    java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss").withZone(java.time.ZoneId.of("UTC"))
  private[this] def fmtTime(i: java.time.Instant): String = timeFmt.format(i) + " UTC"
  private[this] def fmtDuration(from: java.time.Instant, to: java.time.Instant): String = {
    val s = math.max(0L, java.time.Duration.between(from, to).getSeconds)
    if (s >= 3600) f"${s / 3600}h ${(s % 3600) / 60}m ${s % 60}s"
    else if (s >= 60) s"${s / 60}m ${s % 60}s"
    else s"${s}s"
  }
  private[this] def detailRow(label: String, value: String, mono: Boolean = false): String = {
    val vStyle = if (mono) "color:#2f4050;font-family:'Courier New',monospace;font-size:12px;word-break:break-all;"
                 else "color:#2f4050;"
    s"""<tr><td style="padding:7px 0;color:#a0aec0;width:130px;vertical-align:top;">$label</td>""" +
      s"""<td style="padding:7px 0;$vStyle">$value</td></tr>"""
  }

  private[this] def sendEmail(
      clonedId: Workflow.Id,
      originalWorkflowId: Workflow.Id,
      presetId: Long,
      startedAt: java.time.Instant,
      email: String,
      originalWorkflowInfo: WorkflowInfo): Future[Unit] = {
    logger.info(s"Sending email, cloned workflow id: $clonedId, email: $email.")
    val finishedAt = java.time.Instant.now()
    val name = originalWorkflowInfo.name
    val url = RunWorkflowJobContext.generateWorkflowUrl(clonedId.value)
    val details =
      detailRow("Workflow", s"&quot;$name&quot;") +
      detailRow("Workflow ID", originalWorkflowId.value.toString, mono = true) +
      detailRow("Run ID", clonedId.value.toString, mono = true) +
      detailRow("Cluster preset", s"#$presetId") +
      detailRow("Started", fmtTime(startedAt)) +
      detailRow("Finished", fmtTime(finishedAt)) +
      detailRow("Duration", fmtDuration(startedAt, finishedAt)) +
      detailRow("Status", """<span style="color:#1ab394;font-weight:bold;">Finished</span>""")
    val subject =
      s"""6D Analytical Engine — scheduled run of "$name" finished · workflow ${originalWorkflowId.value}"""
    val html =
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
          <h2 style="margin:0 0 14px;color:#2f4050;font-size:18px;">Scheduled run finished &#10003;</h2>
          <p style="margin:0 0 18px;color:#4a5568;font-size:14px;line-height:1.6;">
            Your scheduled workflow <strong>&quot;$name&quot;</strong> has finished running. Execution details:
          </p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 22px;font-size:13px;border-top:1px solid #edf0f2;border-bottom:1px solid #edf0f2;">
            $details
          </table>
          <a href="$url" style="display:inline-block;background:#0197c8;color:#ffffff;text-decoration:none;padding:12px 30px;border-radius:6px;font-size:14px;font-weight:bold;">View report</a>
          <p style="margin:26px 0 0;color:#a0aec0;font-size:12px;line-height:1.6;">
            If the button does not work, copy this link into your browser:<br>
            <a href="$url" style="color:#0197c8;word-break:break-all;">$url</a>
          </p>
        </td></tr>
        <tr><td style="background:#f4f6f8;padding:16px 28px;color:#a0aec0;font-size:12px;">
          6D Analytical Engine &middot; automated notification &mdash; please do not reply.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""
    EmailSenderApi.sendEmail(subject, html, email)
    Future.successful(())
  }
}
