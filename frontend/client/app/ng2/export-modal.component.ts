/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Component } from '@angular/core';
import { DialogRef } from '@angular/cdk/dialog';
import { WorkflowService } from './workflow.service';
import { WorkflowsApiClient } from './workflows-api-client.service';

declare const $: any; // jQuery global

// Phase C / AngularJS removal: export-workflow modal on CDK/ModalService, was common/modals/export-modal.
// download() appends a hidden iframe with the workflow-download URL (an iframe avoids Firefox dropping
// the WebSocket on link click), then closes. Current workflow id via WorkflowService (was $stateParams).
@Component({
  standalone: false,
  template: `
    <div class="modal-content">
      <div class="export-modal">
        <div class="export-modal__header"><div class="modal-title">Export workflow</div></div>
        <div class="export-modal__body">
          <div class="checkbox-wrapper export-label">
            <label class="format-form-label" [ngClass]="{'active': includeDatasources}">
              <input type="checkbox" [checked]="includeDatasources"
                     (change)="includeDatasources = $any($event.target).checked"/>
              <span>Export with definitions of the datasources.</span>
            </label>
          </div>
          <div class="export-additional-info">
            (Note that those definitions may contain sensitive information, e.g. database credentials).
          </div>
        </div>
        <div class="export-modal__footer">
          <button (click)="download()" class="btn btn-blue no-selection" type="button">Export Workflow</button>
          <button (click)="close()" class="btn btn-white" type="button">Cancel</button>
        </div>
      </div>
    </div>
  `
})
export class ExportModalComponent {
  includeDatasources = false;

  constructor(
    private dialogRef: DialogRef<any>,
    private workflowService: WorkflowService,
    private workflowsApiClient: WorkflowsApiClient
  ) {}

  download(): void {
    const id = (this.workflowService as any).getCurrentWorkflow().id;
    const url = (this.workflowsApiClient as any).getDownloadWorkflowMethodUrl(id, this.includeDatasources);
    $('body').append(`<iframe style="display: none" src="${url}"></iframe>`);
    this.close();
  }

  close(): void { this.dialogRef.close(); }
}
