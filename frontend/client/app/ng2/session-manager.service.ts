/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Injectable, Inject } from '@angular/core';
import * as _ from 'lodash';
import { sessionStatus } from '../enums/session-status.js';
import { SessionManagerApi } from './session-manager-api.service';

const CHECKING_SESSION_MANAGER_STATE_TIMEOUT = 10000;

// Phase C-1: migrated from workflows/session-manager.service.js. Polls the (now Angular)
// SessionManagerApi on an $interval (bridged) and caches the per-workflow session list. Injects the
// Angular SessionManagerApi directly; $interval/config are bridged. Polling starts when the service is
// first constructed (lazy — first AngularJS injection), matching the legacy factory's behaviour.
// Public surface (sessions, statusForWorkflowId, clusterInfoForWorkflowId, checkSessionManagerState)
// unchanged; downgraded as 'SessionManager'. A WorkflowService dependency (bottom-up).
@Injectable({ providedIn: 'root' })
export class SessionManager {
  sessions: any[] = [];

  constructor(
    @Inject('$interval') private $interval: any,
    @Inject('config') private config: any,
    private sessionManagerApi: SessionManagerApi
  ) {
    this.pollSessionManager();
    this.$interval(() => { // SM polling
      this.pollSessionManager();
    }, this.config.sessionPollingInterval);
  }

  statusForWorkflowId(workflowId: string): any {
    const session = _.find(this.sessions, (s: any) => s.workflowId === workflowId);
    if (_.isUndefined(session)) {
      return sessionStatus.NOT_RUNNING;
    } else {
      return (session as any).status;
    }
  }

  clusterInfoForWorkflowId(workflowId: string): any {
    const session = _.find(this.sessions, (s: any) => s.workflowId === workflowId);
    return (session as any).cluster;
  }

  checkSessionManagerState(): any {
    return this.sessionManagerApi.downloadSessions({ timeout: CHECKING_SESSION_MANAGER_STATE_TIMEOUT });
  }

  private pollSessionManager(): void {
    this.sessionManagerApi.downloadSessions()
      .then((result: any) => {
        this.sessions = result;
      });
  }
}
