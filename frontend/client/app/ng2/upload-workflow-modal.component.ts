/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Component, Inject } from '@angular/core';
import { DialogRef } from '@angular/cdk/dialog';
import { WorkflowsApiClient } from './workflows-api-client.service';
import successImg from 'ASSETS/images/success.png';

// Phase C / AngularJS removal: upload-workflow modal on CDK/ModalService (was common/modals/upload
// -workflow-modal, folded into HomeComponent). The AngularJS ngf-select is replaced by a native file
// input (a button triggers a hidden <input type=file>); the actual upload still uses ngFileUpload's
// Upload service (bridged) for its .progress() stream. close(workflowId) on success.
@Component({
  standalone: false,
  template: `
    <div class="modal-content">
      <div class="inmodal c-upload-execution-report-modal">
        <div class="modal-header"><h4 class="modal-title">Upload Workflow</h4></div>
        <div class="modal-body center-block">
          <div class="row">
            <deepsense-loading-spinner-sm *ngIf="status === 'loading'"></deepsense-loading-spinner-sm>
            <button type="button" class="center-block btn btn-info c-upload-report-modal__upload-button"
                    *ngIf="status === 'preparing' || status === 'failure'"
                    (click)="fileInput.click()">Choose a file</button>
            <input #fileInput type="file" style="display: none"
                   (change)="onFile($any($event.target).files); fileInput.value = ''">
            <div class="text-center c-upload-report-modal__upload-progress" *ngIf="status === 'loading'">
              {{ progress + ' %' }}
            </div>
            <img class="center-block c-upload-report-modal__img" *ngIf="status === 'success'" [src]="successImg"/>
            <div class="text-danger error-message" *ngIf="status === 'failure'">{{ errorMessage }}</div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-white" (click)="close()">Close</button>
        </div>
      </div>
    </div>
  `
})
export class UploadWorkflowModalComponent {
  readonly successImg = successImg;
  status = 'preparing';
  progress: any = '';
  errorMessage = '';

  constructor(
    private dialogRef: DialogRef<any>,
    @Inject('Upload') private upload: any,
    private workflowsApiClient: WorkflowsApiClient
  ) {}

  onFile(files: FileList): void {
    if (files && files.length) { this.uploadFile(files[0]); }
  }

  private uploadFile(file: File): void {
    this.status = 'failure';
    this.upload.upload({
      url: (this.workflowsApiClient as any).getUploadWorkflowMethodUrl(),
      method: 'POST',
      file,
      fileFormDataName: 'workflowFile'
    }).progress((evt: any) => {
      this.status = 'loading';
      this.progress = parseInt('' + (100.0 * evt.loaded / evt.total), 10);
    }).then((response: any) => {
      this.status = 'success';
      this.dialogRef.close(response.data.workflowId);
    }).catch(({ data } = {} as any) => {
      const { message } = (data || {});
      this.status = 'failure';
      this.errorMessage = message || 'Server error';
    });
  }

  close(): void { this.dialogRef.close(undefined); }
}
