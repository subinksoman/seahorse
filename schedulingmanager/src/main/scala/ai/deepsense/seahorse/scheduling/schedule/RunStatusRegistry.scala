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
import java.util.concurrent.ConcurrentHashMap

// In-memory status of on-demand (run-now) and scheduled runs, keyed by run id (the cloned workflow id).
// Survives session teardown (unlike the session-manager, which deletes the session on completion), so a
// caller can query a run's outcome after it finishes. Note: not persisted — cleared on service restart.
object RunStatusRegistry {

  final case class RunInfo(
    runId: UUID,
    workflowId: UUID,
    status: String,
    startedAt: String,
    finishedAt: Option[String],
    error: Option[String])

  object Status {
    val Running = "RUNNING"
    val Finished = "FINISHED"
    val Failed = "FAILED"
  }

  private val runs = new ConcurrentHashMap[UUID, RunInfo]()

  def started(runId: UUID, workflowId: UUID, startedAt: String): Unit =
    runs.put(runId, RunInfo(runId, workflowId, Status.Running, startedAt, None, None))

  def finished(runId: UUID, finishedAt: String): Unit =
    Option(runs.get(runId)).foreach { i =>
      runs.put(runId, i.copy(status = Status.Finished, finishedAt = Some(finishedAt)))
    }

  def failed(runId: UUID, finishedAt: String, error: String): Unit =
    Option(runs.get(runId)).foreach { i =>
      runs.put(runId, i.copy(status = Status.Failed, finishedAt = Some(finishedAt), error = Some(error)))
    }

  def get(runId: UUID): Option[RunInfo] = Option(runs.get(runId))
}
