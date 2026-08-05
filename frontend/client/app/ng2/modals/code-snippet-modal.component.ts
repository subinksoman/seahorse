/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Component, Inject, ElementRef, AfterViewInit, ViewChild } from '@angular/core';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';

declare const ace: any; // ace-builds (loaded globally via libs.js; modes registered by the opener component)

// Phase C / AngularJS removal: the code-snippet "Edit in a window" modal on CDK/ModalService (was
// attribute-code-snippet-type-modal). Editable ACE editor (mode from language); OK closes with the
// edited code, Cancel dismisses. Direct ace.edit() replaces the legacy ui-ace directive.
@Component({
  standalone: false,
  template: `
    <div class="modal-content">
      <div class="modal-header"><h3 class="modal-title">Edit code</h3></div>
      <div class="modal-body"><div #editor class="ace_editor_modal"></div></div>
      <div class="modal-footer">
        <button class="btn btn-warning" type="button" (click)="cancel()">Cancel</button>
        <button class="btn btn-primary" type="button" (click)="ok()">OK</button>
      </div>
    </div>
  `
})
export class CodeSnippetModalComponent implements AfterViewInit {
  @ViewChild('editor', { static: true }) editorEl: ElementRef;
  private editor: any;

  constructor(
    @Inject(DIALOG_DATA) private data: { code: string; language: string },
    private dialogRef: DialogRef<string>
  ) {}

  ngAfterViewInit(): void {
    this.editor = ace.edit(this.editorEl.nativeElement);
    this.editor.getSession().setMode('ace/mode/' + (this.data.language || 'text'));
    this.editor.setFontSize('16px');
    this.editor.setValue(this.data.code || '', -1);
  }

  ok(): void { this.dialogRef.close(this.editor.getValue()); }
  cancel(): void { this.dialogRef.close(undefined); }
}
