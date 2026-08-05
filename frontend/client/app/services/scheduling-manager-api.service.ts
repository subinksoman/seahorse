/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Injectable, Inject } from '@angular/core';
import { HttpService } from '../core/http.service';

// Angular port of the removed common/api/scheduling-manager-api.service.js (REST client for the
// schedulingmanager backend, reached through the proxy at /schedulingmanager/v1). Same pattern as
// DatasourcesApiService: HttpService + the bridged `config` for the api host/port.
@Injectable({ providedIn: 'root' })
export class SchedulingManagerApi {
  private readonly servicePath = '/schedulingmanager/v1';
  private readonly apiUrl: string;

  constructor(private http: HttpService, @Inject('config') config: any) {
    this.apiUrl = `${config.apiHost}:${config.apiPort}`;
  }

  private url(path = ''): string {
    return `${this.apiUrl}${this.servicePath}${path}`;
  }

  getSchedulesForWorkflow(workflowId: string): Promise<any> {
    return this.http.get(this.url(`/workflow/${workflowId}/schedules`)).then((r) => r.data);
  }

  putWorkflowSchedule(workflowSchedule: any): Promise<any> {
    return this.http.put(this.url(`/workflow-schedules/${workflowSchedule.id}`), workflowSchedule).then((r) => r.data);
  }

  deleteWorkflowSchedule(scheduleId: string): Promise<any> {
    return this.http.delete(this.url(`/workflow-schedules/${scheduleId}`));
  }
}
