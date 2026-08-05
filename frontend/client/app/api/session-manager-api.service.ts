/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Injectable, Inject } from '@angular/core';
import { HttpService } from '../core/http.service';

// Phase C-1: migrated from common/api-clients/session-manager-api.service.js. Standalone $http client
// for the sessions endpoint (does NOT extend BaseApiClient). Uses bridged $http/$log and the config
// constant. Public surface (downloadSessions/downloadSessionByWorkflowId/deleteSessionById/
// startSession) unchanged; downgraded as 'SessionManagerApi'.
@Injectable({ providedIn: 'root' })
export class SessionManagerApi {
  private readonly URL: string;

  constructor(
    private $http: HttpService,
    @Inject('config') config: any
  ) {
    this.URL = config.sessionApiPort
      ? `${config.apiHost}:${config.sessionApiPort}/${config.urlApiVersion}/sessions`
      : `${config.apiHost}/${config.urlApiVersion}/sessions`;
  }

  downloadSessions(config?: any): any {
    return this.$http.get(this.URL, config).then((result: any) => {
      return result.data.sessions;
    });
  }

  downloadSessionByWorkflowId(workflowId: string): any {
    return this.$http.get(`${this.URL}/${workflowId}`).then((result: any) => {
      return result.data;
    });
  }

  deleteSessionById(workflowId: string): any {
    return this.$http.delete(`${this.URL}/${workflowId}`).then((result: any) => {
      return result;
    });
  }

  startSession(config?: any): any {
    return this.$http.post(this.URL, config).then((result: any) => {
      return result;
    });
  }
}
