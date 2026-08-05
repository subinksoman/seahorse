/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Component, Inject } from '@angular/core';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';

// Phase C / AngularJS removal — FIRST modal converted off uib-modal onto @angular/cdk (ModalService).
// Was common/modals/confirmation-modal/confirmation-modal.html + its (already-folded) controller.
// Reuses the Bootstrap `.modal-content` markup so it looks identical. close(true)=OK, close(false)=Cancel.
@Component({
  standalone: false,
  template: `
    <div class="modal-content">
      <div class="inmodal">
        <div class="modal-header">
          <h4 class="modal-title">Are you sure to proceed?</h4>
        </div>
        <div class="modal-body">{{ data?.message }}</div>
        <div class="modal-footer">
          <button type="button" class="btn btn-white" (click)="close(false)">Cancel</button>
          <button type="button" class="btn btn-info" (click)="close(true)" cdkFocusInitial>OK</button>
        </div>
      </div>
    </div>
  `
})
export class ConfirmationModalComponent {
  constructor(
    @Inject(DIALOG_DATA) public data: { message: string },
    private dialogRef: DialogRef<boolean>
  ) {}

  close(result: boolean): void {
    this.dialogRef.close(result);
  }
}
