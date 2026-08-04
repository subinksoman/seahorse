/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Component, Inject } from '@angular/core';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';

declare const angular: any; // global (expose-loader) — angular.copy of the workflow

// Phase C / AngularJS removal: clone-workflow modal on CDK/ModalService, was common/modals/workflow-clone
// -modal. Receives the original workflow via DIALOG_DATA, edits a "Copy of …" copy, close(copy) on save.
@Component({
  standalone: false,
  template: `
    <div class="modal-content">
      <div class="inmodal">
        <div class="modal-header">
          <h4 class="modal-title">Clone workflow - {{ originalWorkflow?.name }}</h4>
        </div>
        <div class="modal-body">
          <div class="row"><div class="col-md-12">
            <div class="form-group">
              <label>Workflow clone name</label>
              <input type="text" class="form-control" [value]="workflowCopy.name"
                     (input)="workflowCopy.name = $any($event.target).value"
                     placeholder="Name for a new workflow" autofocus>
            </div>
            <div class="form-group">
              <label>Description</label>
              <textarea class="form-control" [value]="workflowCopy.description || ''"
                        (input)="workflowCopy.description = $any($event.target).value"
                        placeholder="Workflow clone description"></textarea>
            </div>
          </div></div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-white" (click)="close()">Close</button>
          <button type="button" [disabled]="!workflowCopy.name" class="btn btn-primary"
                  (click)="save()">Clone workflow</button>
        </div>
      </div>
    </div>
  `
})
export class WorkflowCloneModalComponent {
  originalWorkflow: any;
  workflowCopy: any;

  constructor(@Inject(DIALOG_DATA) data: any, private dialogRef: DialogRef<any>) {
    this.originalWorkflow = data.workflow;
    this.workflowCopy = angular.copy(data.workflow);
    this.workflowCopy.name = `Copy of ${this.workflowCopy.name}`;
  }

  save(): void { this.dialogRef.close(this.workflowCopy); }
  close(): void { this.dialogRef.close(undefined); }
}
