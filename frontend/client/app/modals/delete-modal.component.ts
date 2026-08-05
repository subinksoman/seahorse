/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Component } from '@angular/core';
import { DialogRef } from '@angular/cdk/dialog';

// Phase C / AngularJS removal: delete-confirmation modal (with "don't show again") on CDK/ModalService,
// was common/modals/delete-modal. ok() closes with { doNotShowAgain }, cancel() closes undefined. Uses
// [checked]/(change) rather than ngModel to avoid pulling in @angular/forms.
@Component({
  standalone: false,
  template: `
    <div class="modal-content">
      <div class="inmodal delete-confirmation-modal">
        <div class="modal-header">
          <h4 class="modal-title">Deletion cannot be undone</h4>
        </div>
        <div class="modal-body">
          <label class="custom-checkbox">
            <input type="checkbox" [checked]="doNotShowAgain"
                   (change)="doNotShowAgain = $any($event.target).checked" name="delete_confirmation">
            <span>Do not show this message again</span>
          </label>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-white" (click)="cancel()">Cancel</button>
          <button type="button" class="btn btn-info" (click)="ok()">OK</button>
        </div>
      </div>
    </div>
  `
})
export class DeleteModalComponent {
  doNotShowAgain = false;

  constructor(private dialogRef: DialogRef<any>) {}

  ok(): void { this.dialogRef.close({ doNotShowAgain: this.doNotShowAgain }); }
  cancel(): void { this.dialogRef.close(undefined); }
}
