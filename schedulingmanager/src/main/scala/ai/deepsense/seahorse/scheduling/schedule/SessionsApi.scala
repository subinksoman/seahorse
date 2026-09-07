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

import java.net.URL
import java.util.concurrent.TimeUnit

import org.apache.pekko.util.Timeout

import scala.concurrent.Future
import scala.concurrent.duration.FiniteDuration

import ai.deepsense.commons.models.ClusterDetails
import ai.deepsense.commons.utils.LoggerForCallerClass
import ai.deepsense.graph.nodestate.name.NodeStatusName
import ai.deepsense.models.workflows.Workflow
import ai.deepsense.seahorse.scheduling.SchedulingManagerConfig
import ai.deepsense.sessionmanager.rest.client.SessionManagerClient
import ai.deepsense.sessionmanager.service.Status

private[schedule] object SessionsApi {
  import scala.concurrent.ExecutionContext.Implicits.global

  private[this] val logger = LoggerForCallerClass()

  private[this] val sessionManagerConfig = SchedulingManagerConfig.config.getConfig("session-manager")
  private[this] lazy val sessionManagerClient = {
    val url: URL = new URL(sessionManagerConfig.getString("url") + "/v1/sessions/")
    logger.info(s"Creating sessions client with url $url.")
    val timeout = Timeout(FiniteDuration(sessionManagerConfig.getDuration("timeout").toMillis, TimeUnit.MILLISECONDS))
    new SessionManagerClient(
      mandatoryUserId = RunWorkflowJobContext.userId,
      mandatoryUserName = RunWorkflowJobContext.userName,
      apiUrl = url,
      credentials = None)(
      RunWorkflowJobContext.actorSystem, timeout)
  }

  def startSession(id: Workflow.Id, clusterDetails: ClusterDetails): Future[Unit] = {
    logger.info(s"Creating session for $id with cluster: $clusterDetails.")
    def sessionStatus(): Future[Status.Value] = sessionManagerClient.fetchSession(id).map(_.status)
    def retryUntilFinished(): Future[Unit] = sessionStatus().flatMap { status =>
      if (status == Status.Running) {
        logger.info(s"Session for $id created successfully.")
        Future.successful(())
      } else if (status == Status.Error) {
        logger.error(s"There was an error while creating a session for $id.")
        Future.failed(new RuntimeException(s"Could not create a session for $id."))
      } else {
        Thread.sleep(5000)
        logger.info(s"Session for workflow $id isn't running yet; asking for status again.")
        retryUntilFinished()
      }
    }
    sessionManagerClient.createSession(id, clusterDetails).flatMap(_ => retryUntilFinished())
  }

  def deleteSession(id: Workflow.Id): Future[Unit] = {
    logger.info(s"Deleting session for $id.")
    sessionManagerClient.deleteSession(id).map(_ => ())
  }

  // Returns the final per-node status counts once the run settles, so the caller can tell a
  // successful run from a failed one (nodes ending in Failed/Aborted).
  def runWorkflow(id: Workflow.Id): Future[Map[NodeStatusName, Int]] = {
    val notFinishedStatuses = Set[NodeStatusName](NodeStatusName.Draft, NodeStatusName.Running, NodeStatusName.Queued)

    def retryUntilFinished(): Future[Map[NodeStatusName, Int]] =
      sessionManagerClient.queryNodeStatuses(id).flatMap { response =>
        logger.info(s"Running status of workflow $id: $response")
        // Finished only once the executor has reported statuses AND none remain Draft/Running/Queued.
        // nodeStatuses is None until the executor reports — keep polling in that case.
        val finishedStatuses = response.nodeStatuses.filter { statusesMap =>
          statusesMap.filterKeys(notFinishedStatuses.contains).values.sum == 0
        }
        finishedStatuses match {
          case Some(statuses) =>
            logger.info(s"Workflow $id finished running. Final node statuses: $statuses")
            Future.successful(statuses)
          case None =>
            Thread.sleep(5000)
            logger.info(s"Workflow $id didn't finish running yet; asking for status again.")
            retryUntilFinished()
        }
      }

    logger.info(s"Running workflow $id.")
    sessionManagerClient.launchSession(id).flatMap(_ => retryUntilFinished())
  }
}
