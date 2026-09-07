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

package ai.deepsense.seahorse.scheduling.api

import java.util.UUID

import slick.dbio._

import scala.concurrent.Await
import scala.util.{Failure, Success, Try}

import ai.deepsense.commons.config.ConfigToPropsLossy
import ai.deepsense.commons.service.api.CommonApiExceptions
import ai.deepsense.commons.service.db.dbio.{GenericDBIOs, TryDBIO}
import ai.deepsense.seahorse.scheduling.SchedulingManagerConfig
import ai.deepsense.seahorse.scheduling.converters.SchedulesConverters
import ai.deepsense.seahorse.scheduling.db.Database
import ai.deepsense.seahorse.scheduling.db.dbio.WorkflowSchedulesDBIOs
import ai.deepsense.seahorse.scheduling.db.schema.WorkflowScheduleSchema
import ai.deepsense.seahorse.scheduling.db.schema.WorkflowScheduleSchema.WorkflowScheduleDB
import ai.deepsense.seahorse.scheduling.model.{JsonBodyForError, RunNowResponse, RunStatusResponse, WorkflowExecutionInfo, WorkflowSchedule}
import ai.deepsense.seahorse.scheduling.schedule.{RunStatusRegistry, RunWorkflowJob, WorkflowScheduler}

class SchedulingManagerApi extends DefaultApi {
  import scala.concurrent.ExecutionContext.Implicits.global

  private val scheduler = {
    val s = new WorkflowScheduler[RunWorkflowJob](ConfigToPropsLossy(SchedulingManagerConfig.config))
    s.start()
    s
  }

  private val genericDBIOs = new GenericDBIOs[WorkflowSchedule, WorkflowScheduleDB] {
    override val api = ai.deepsense.seahorse.scheduling.db.Database.api
    override val table = WorkflowScheduleSchema.workflowScheduleTable
    override val fromDB = SchedulesConverters.fromDb _
    override val fromApi = SchedulesConverters.fromApi _
  }

  override def getSchedulesForWorkflowImpl(workflowId: UUID): List[WorkflowSchedule] =
    WorkflowSchedulesDBIOs.getAllForWorkflow(workflowId).run()

  override def getWorkflowScheduleImpl(scheduleId: UUID): WorkflowSchedule =
    genericDBIOs.get(scheduleId).run()

  override def getWorkflowSchedulesImpl(): List[WorkflowSchedule] =
    genericDBIOs.getAll.run()

  override def putWorkflowScheduleImpl(scheduleId: UUID, workflowSchedule: WorkflowSchedule): WorkflowSchedule = (for {
    updated <- genericDBIOs.insertOrUpdate(scheduleId, workflowSchedule)
    () <- TryDBIO(scheduler.activateSchedule(updated))
  } yield updated).run()

  override def deleteWorkflowScheduleImpl(scheduleId: UUID): Unit = (for {
    () <- genericDBIOs.delete(scheduleId)
    () <- TryDBIO(scheduler.deactivateSchedule(scheduleId))
  } yield ()).run()

  // Status of an on-demand or scheduled run, by its run id (the cloned workflow id). Backed by the
  // in-memory RunStatusRegistry, so it stays queryable after the session is torn down. 404 if unknown.
  override def getRunStatusImpl(runId: UUID): RunStatusResponse =
    RunStatusRegistry.get(runId) match {
      case Some(i) =>
        RunStatusResponse(
          runId = i.runId,
          workflowId = i.workflowId,
          status = i.status,
          startedAt = i.startedAt,
          finishedAt = i.finishedAt,
          error = i.error)
      case None =>
        throw ApiExceptionFromCommon(SchedulerApiExceptions.runNotFound(runId))
    }

  // Runs a workflow immediately, once, without persisting a schedule. Reuses the same
  // clone -> session -> run -> email pipeline the scheduler drives, but fires it on demand.
  // Awaits only the clone step so the caller gets the run id right away; the session/run/email
  // steps continue in the background. The email report arrives when the run finishes.
  override def runWorkflowNowImpl(workflowId: UUID, executionInfo: WorkflowExecutionInfo): RunNowResponse = {
    import scala.concurrent.duration._
    val runId = Await.result(
      new RunWorkflowJob().startRun(
        workflowId.toString,
        executionInfo.emailForReports,
        executionInfo.presetId),
      60.seconds)
    RunNowResponse(status = "accepted", runId = runId)
  }

  // TODO DRY
  implicit class DBIOOps[T](dbio: DBIO[T]) {
    import scala.concurrent.duration._
    def run(): T = {
      import ai.deepsense.seahorse.scheduling.db.Database.api.{Database => _, _}
      val futureResult = Database.db.run(dbio.transactionally)
      Try {
        Await.result(futureResult, SchedulingManagerConfig.database.timeout)
      } match {
        case Success(value) => value
        case Failure(commonEx: CommonApiExceptions.ApiException) => throw ApiExceptionFromCommon(commonEx)
        // Re-throw any other failure (e.g. a DB TimeoutException) instead of falling through to a
        // MatchError, so handleErrors turns it into a proper 500 with the real cause.
        case Failure(ex) => throw ex
      }
    }
    implicit def durationJavaToScala(d: java.time.Duration): Duration = Duration.fromNanos(d.toNanos)
  }

  // Codegen abstracts from application-specific error body format
  override protected def formatErrorBody(code: Int, msg: String): String = JsonBodyForError(code, msg)
}
