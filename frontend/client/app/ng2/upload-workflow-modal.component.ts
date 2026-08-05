/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Component, ChangeDetectorRef } from '@angular/core';
import { DialogRef } from '@angular/cdk/dialog';
import { WorkflowsApiClient } from './workflows-api-client.service';
import { HttpService } from './http.service';
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
    private http: HttpService,
    private workflowsApiClient: WorkflowsApiClient,
    private cdr: ChangeDetectorRef
  ) {}

  onFile(files: FileList): void {
    if (files && files.length) { this.uploadFile(files[0]); }
  }

  // was ngFileUpload's Upload.upload(); native multipart POST via HttpService (XHR path, with progress).
  private uploadFile(file: File): void {
    this.status = 'loading';
    this.progress = 0;
    const fd = new FormData();
    fd.append('workflowFile', file);
    this.http.post((this.workflowsApiClient as any).getUploadWorkflowMethodUrl(), fd, {
      uploadEventHandlers: {
        progress: (evt: any) => {
          if (evt && evt.lengthComputable) {
            this.status = 'loading';
            this.progress = parseInt('' + (100.0 * evt.loaded / evt.total), 10);
            this.cdr.detectChanges();
          }
        }
      }
    }).then((response: any) => {
      this.status = 'success';
      this.dialogRef.close(response.data.workflowId);
    }).catch((response: any) => {
      const message = response && response.data && response.data.message;
      this.status = 'failure';
      this.errorMessage = message || 'Server error';
      this.cdr.detectChanges();
    });
  }

  close(): void { this.dialogRef.close(undefined); }
}
