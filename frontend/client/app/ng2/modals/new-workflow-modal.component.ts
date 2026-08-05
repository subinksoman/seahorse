/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Component } from '@angular/core';
import { DialogRef } from '@angular/cdk/dialog';
import { WorkflowsApiClient } from '../api/workflows-api-client.service';

// Phase C / AngularJS removal: new-workflow modal on CDK/ModalService (was common/modals/new-workflow
// -modal, folded into HomeComponent via child-scope). ok() creates the workflow then close(workflowId);
// HomeComponent navigates to the editor on that result.
@Component({
  standalone: false,
  template: `
    <div class="modal-content">
      <div class="inmodal c-new-workflow-modal">
        <div>
          <div class="modal-header"><h4 class="modal-title">New workflow</h4></div>
          <div class="modal-body">
            <div class="row">
              <deepsense-loading-spinner-sm *ngIf="loading"></deepsense-loading-spinner-sm>
              <div class="form-horizontal" *ngIf="!loading">
                <div class="form-group clearfix">
                  <label class="control-label col-sm-2" for="workflow-name">Name:</label>
                  <div class="col-sm-10">
                    <input [value]="name" (input)="name = $any($event.target).value"
                           type="text" autofocus class="form-control" id="workflow-name" placeholder="Draft workflow">
                  </div>
                </div>
                <div class="form-group">
                  <label class="control-label col-sm-2" for="workflow-description">Description:</label>
                  <div class="col-sm-10">
                    <textarea [value]="description" (input)="description = $any($event.target).value"
                              class="form-control" id="workflow-description"></textarea>
                  </div>
                </div>
              </div>
              <div class="pull-right text-danger" *ngIf="errorMessage">{{ errorMessage }}</div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-white" (click)="close()">Close</button>
            <button type="button" class="btn btn-info" (click)="ok()">Create</button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class NewWorkflowModalComponent {
  name = '';
  description = '';
  loading = false;
  errorMessage: string;

  constructor(private dialogRef: DialogRef<any>, private workflowsApiClient: WorkflowsApiClient) {}

  ok(): void {
    const DEFAULT_NAME = 'Draft workflow';
    this.loading = true;
    (this.workflowsApiClient as any).createWorkflow({
      name: this.name || DEFAULT_NAME,
      description: this.description || ''
    }).then((response: any) => {
      this.dialogRef.close(response.workflowId);
    }).catch(({ data } = {} as any) => {
      const { message } = (data || {});
      this.loading = false;
      this.errorMessage = message || 'Server error';
    });
  }

  close(): void { this.dialogRef.close(undefined); }
}
