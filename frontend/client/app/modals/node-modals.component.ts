/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Component, Inject } from '@angular/core';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

// Phase C / AngularJS removal: the two attributes-panel modals on CDK/ModalService (were inline
// child-scope $uibModals). Plain content (iframe / error text) — no downgraded children.

// Jupyter notebook iframe. The URL is trusted via Angular's DomSanitizer (was AngularJS $sce).
@Component({
  standalone: false,
  template: `
    <div class="modal-content ds-modal-notebook__content">
      <iframe class="ds-modal-notebook__frame" frameborder="0" [src]="url"></iframe>
      <div class="ds-modal-notebook__footer">
        <button type="button" class="btn btn-default" (click)="close()">Close</button>
      </div>
    </div>
  `
})
export class NotebookModalComponent {
  url: SafeResourceUrl;

  constructor(
    @Inject(DIALOG_DATA) data: any,
    private dialogRef: DialogRef<any>,
    sanitizer: DomSanitizer
  ) {
    this.url = sanitizer.bypassSecurityTrustResourceUrl(data.url);
  }

  close(): void { this.dialogRef.close(); }
}

// Node execution-error trace.
@Component({
  standalone: false,
  template: `
    <div class="modal-content">
      <button type="button" class="close" aria-label="Close" (click)="close()">
        <span aria-hidden="true">&times;</span>
      </button>
      <h2>Error title:</h2>
      <pre class="o-error-trace">{{ node?.state?.error?.title || 'No title' }}</pre>
      <h2>Error message:</h2>
      <pre class="o-error-trace">{{ node?.state?.error?.message || 'No message' }}</pre>
      <div *ngIf="node?.state?.error?.details?.stacktrace">
        <h2>Stack trace:</h2>
        <pre class="o-error-trace o-error-full-trace">{{ node.state.error.details.stacktrace }}</pre>
      </div>
      <button type="button" class="btn btn-default pull-right" (click)="close()">Close</button>
      <br style="clear: right;" />
    </div>
  `
})
export class ErrorMessageModalComponent {
  node: any;

  constructor(@Inject(DIALOG_DATA) data: any, private dialogRef: DialogRef<any>) {
    this.node = data.node;
  }

  close(): void { this.dialogRef.close(); }
}
