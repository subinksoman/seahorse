/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Injectable } from '@angular/core';
import { SchedulingManagerApi } from './scheduling-manager-api.service';
import { UUIDGenerator } from './uuid-generator.service';

// Angular port of the removed common/schedules/workflow-schedules.service.js — the business layer over
// SchedulingManagerApi (fetch/update/delete a workflow's schedules + generate a new-schedule stub).
@Injectable({ providedIn: 'root' })
export class WorkflowSchedulesService {
  constructor(private api: SchedulingManagerApi, private uuid: UUIDGenerator) {}

  fetchSchedules(workflowId: string): Promise<any> {
    return this.api.getSchedulesForWorkflow(workflowId);
  }

  updateSchedule(schedule: any): Promise<any> {
    return this.api.putWorkflowSchedule(schedule);
  }

  deleteSchedule(scheduleId: string): Promise<any> {
    return this.api.deleteWorkflowSchedule(scheduleId);
  }

  generateScheduleStub(workflowId: string): any {
    return {
      id: this.uuid.generateUUID(),
      schedule: { cron: '0 12 * * *' },
      workflowId: workflowId,
      executionInfo: { emailForReports: '', presetId: -1 }
    };
  }
}
