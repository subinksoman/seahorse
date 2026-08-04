/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Component, Inject, ElementRef, AfterViewInit, ViewChild } from '@angular/core';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import 'ace-builds/src-min-noconflict/mode-text.js';

declare const ace: any; // ace-builds (loaded globally via libs.js)

// Phase C / AngularJS removal: the report-table "More" cell-viewer modal on CDK/ModalService (was
// report-table/cell-viewer). The legacy ui-ace read-only editor becomes a direct ace.edit() (same
// pattern as the migrated code-snippet component), dropping the ui.ace dependency for this modal.
@Component({
  standalone: false,
  template: `
    <div class="modal-content">
      <div class="modal-body">
        <div #editor class="ace_editor_modal"></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-primary" type="button" (click)="close()">Close</button>
      </div>
    </div>
  `
})
export class CellViewerModalComponent implements AfterViewInit {
  @ViewChild('editor', { static: true }) editorEl: ElementRef;

  constructor(
    @Inject(DIALOG_DATA) private data: { code: string },
    private dialogRef: DialogRef<any>
  ) {}

  ngAfterViewInit(): void {
    const editor = ace.edit(this.editorEl.nativeElement);
    editor.getSession().setMode('ace/mode/text');
    editor.setValue(this.data && this.data.code ? this.data.code : '', -1);
    editor.setReadOnly(true);
  }

  close(): void { this.dialogRef.close(); }
}
