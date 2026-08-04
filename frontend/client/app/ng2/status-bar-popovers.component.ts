/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Component, Inject } from '@angular/core';
import moment from 'moment';
import { WorkflowService } from './workflow.service';
import { SessionManagerApi } from './session-manager-api.service';

// Phase C / workflows-status-bar: the three "additional HTML for owner" popovers that the legacy
// menu-item rendered via <ng-include src="miCtrl.additionalHtmlForOwner"> (a dynamic template URL
// with its own ng-controller). ng-include has no Angular equivalent, so each popover becomes a
// downgraded component and the migrated <menu-item> switches on a popover KEY ('starting' /
// 'running' / 'error') instead of an HTML URL. ng-show -> *ngIf (Angular CD re-evaluates on click).

// starting-popover.ctrl.js — viewer-mode hint, dismissal persisted in localStorage.
@Component({
  standalone: false,
  selector: 'starting-popover',
  template: `
    <div class="info-popup" *ngIf="!isPopoverClosed()">
      <div class="info-popup__content">
        <div>
          <span>You are now in <b>viewer mode</b>. Click the button above to enable editing.</span>
        </div>
        <div class="info-popup__content-button" (click)="closePopover()">
          <span>Ok, got it.</span>
        </div>
      </div>
    </div>
  `
})
export class StartingPopoverComponent {
  private startingPopoverKey: string;

  constructor(@Inject('config') config: any) {
    this.startingPopoverKey = config.apiVersion + '-startingPopover';
  }

  isPopoverClosed(): boolean {
    const startingPopover = JSON.parse(localStorage.getItem(this.startingPopoverKey));
    return startingPopover && startingPopover.closed;
  }

  closePopover(): void {
    localStorage.setItem(this.startingPopoverKey, JSON.stringify({ closed: true }));
  }
}

// running-executor-popover.ctrl.js — "Hold on…" spinner while the executor boots; Abort stops.
@Component({
  standalone: false,
  selector: 'running-executor-popover',
  template: `
    <div class="info-popup" *ngIf="isRunningExecutorPopoverVisible">
      <div class="info-popup__content">
        <div>
          <span><b>Hold on...</b></span>
          <div class="progress">
            <div class="progress-bar progress-bar-striped active"
                 role="progressbar" aria-valuenow="45" aria-valuemin="0" aria-valuemax="100"
                 style="width: 100%">
            </div>
          </div>
          <span>Starting our application on Apache Spark. It can take up to 2 minutes.</span>
        </div>
        <div class="info-popup__content-button" (click)="abort()">
          <span>Abort</span>
        </div>
      </div>
    </div>
  `
})
export class RunningExecutorPopoverComponent {
  isRunningExecutorPopoverVisible = true;

  constructor(@Inject('$rootScope') private $rootScope: any) {}

  abort(): void {
    this.$rootScope.$emit('StatusBar.STOP_EDITING', true);
    this.isRunningExecutorPopoverVisible = false;
  }
}

// executor-error.ctrl.js — error state; Restart deletes the session then re-emits START_EDITING.
@Component({
  standalone: false,
  selector: 'executor-error',
  template: `
    <div class="info-popup" *ngIf="visible">
      <div class="info-popup__content">
        <div>
          <span>
            Something went wrong, try again later. If the problem persists,
            please contact administrators providing them id of this workflow ({{ workflow?.id }})
            and current time ({{ currentTime }}).
          </span>
        </div>
        <div class="info-popup__content-button" (click)="runExecutorAgain()">
          <span>Restart</span>
        </div>
      </div>
    </div>
  `
})
export class ExecutorErrorComponent {
  visible = true;
  workflow: any;
  currentTime: string;

  constructor(
    @Inject('$rootScope') private $rootScope: any,
    private workflowService: WorkflowService,
    private sessionManagerApi: SessionManagerApi
  ) {
    this.workflow = (this.workflowService as any).getCurrentWorkflow();
    this.currentTime = moment(new Date()).format('YYYY-MM-DD HH:mm:ss');
  }

  runExecutorAgain(): void {
    this.visible = false;
    (this.sessionManagerApi as any).deleteSessionById(this.workflow.id)
      .then(() => this.$rootScope.$broadcast('StatusBar.START_EDITING'));
  }
}
