/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import {
  Component, Input, Output, EventEmitter, Inject, ElementRef, ViewChild,
  AfterViewInit, OnChanges, OnDestroy, SimpleChanges
} from '@angular/core';
// ACE editor + the language modes the snippet editor supports (side-effect: register the modes).
import 'ace-builds/src-min-noconflict/mode-sql.js';
import 'ace-builds/src-min-noconflict/mode-python.js';
import 'ace-builds/src-min-noconflict/mode-r.js';
import { ModalService } from './modal.service';
import { CodeSnippetModalComponent } from './code-snippet-modal.component';

declare const ace: any; // ace-builds (loaded globally via libs.js)

// Phase C / deepsense-attributes: migrated from attribute-types/attribute-code-snippet. Inline ACE code
// editor (SQL/Python/R) for a code-snippet parameter + an "Edit in a window" modal. Downgraded
// 'attributeCodeSnippetType'; attributes-list rebinds [value]/(value-change)/[language]. The legacy ui-ace
// directive is reimplemented by driving ACE directly (init in ngAfterViewInit, mode from language, two-way
// value). The edit-in-window modal (its own ui-ace) stays AngularJS, opened via bridged $uibModal with its
// original controller.
@Component({
  standalone: false,
  selector: 'attribute-code-snippet-type',
  template: `
    <div #editor class="code-snippet-editor" style="min-height: 120px;"></div>
    <button class="btn btn-info attributes-list-btn-wide" style="margin-top: 2px;"
            (click)="editInWindow()">Edit in a window</button>
  `
})
export class AttributeCodeSnippetTypeComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() value: any;
  @Output() valueChange = new EventEmitter<any>();
  @Input() language: any;

  @ViewChild('editor') editorEl: ElementRef;
  private editor: any;

  constructor(private modal: ModalService) {}

  ngAfterViewInit(): void {
    this.editor = ace.edit(this.editorEl.nativeElement);
    this.applyMode();
    this.editor.setValue(this.value || '', -1);
    this.editor.on('change', () => {
      const v = this.editor.getValue();
      if (v !== this.value) {
        this.value = v;
        this.valueChange.emit(v);
      }
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.editor) {
      return;
    }
    if (changes.language) {
      this.applyMode();
    }
    if (changes.value && this.editor.getValue() !== this.value) {
      this.editor.setValue(this.value || '', -1);
    }
  }

  ngOnDestroy(): void {
    if (this.editor) {
      this.editor.destroy();
    }
  }

  private applyMode(): void {
    const mode = (this.language || 'text').toLowerCase();
    this.editor.getSession().setMode('ace/mode/' + mode);
  }

  editInWindow(): void {
    this.modal.open<string>(
      CodeSnippetModalComponent,
      { code: this.value, language: (this.language || 'text').toLowerCase() },
      { panelClass: ['ds-modal-panel', 'ds-modal-lg'] }
    ).result.then((modifiedCode) => {
      if (modifiedCode !== undefined && this.value !== modifiedCode) {
        this.value = modifiedCode;
        this.valueChange.emit(modifiedCode);
        if (this.editor && this.editor.getValue() !== modifiedCode) {
          this.editor.setValue(modifiedCode || '', -1);
        }
      }
    });
  }
}
