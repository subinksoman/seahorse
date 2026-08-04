/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Component, Input, Output, EventEmitter } from '@angular/core';
// NOTE: general-data-panel.less is NOT imported here — it is loaded globally via workflows/workflows.less
// (which imports panels.less first, providing @general-panel-padding). Importing it standalone fails because
// the .less was never self-contained.

const ENTER_KEY_CODE = 13;
const ESCAPE_KEY_CODE = 27;

// Phase C / editor side panels: migrated from workflows/general-data-panel (directive + controller). The
// right-hand panel shown when no node is selected — edit the workflow name/description + list public params.
// Downgraded as directive 'generalDataPanel'; workflows-editor.html (still AngularJS) rebinds to Angular
// syntax (the sibling `resizable` directive stays AngularJS on the host and composes).
//  - two-way `name`/`description`/`publicParams` -> @Input + @Output (workflows-editor rebinds explicitly).
//  - inline-edit controller (editableInputs/buffer/showInput/hideInput/enableEdition/saveNewValue) folded in.
//  - uib-tooltip (edit hints) -> CSS-hover tooltips (removes a ui-bootstrap dep); ng-model -> [value]/(input);
//    ng-blur/ng-keydown -> (blur)/(keydown); custom-scroll-bar + focus-element are the Angular directives.
//  - embeds the migrated <public-params-list>; the dead <workflow-schedules> element (no definition exists
//    anywhere) is dropped (it rendered nothing) — the "Schedules:" placeholder header is kept.
@Component({
  standalone: false,
  selector: 'general-data-panel',
  template: `
    <aside class="ibox o-general-data-panel o-panel o-panel--scroll-right animated fadeInRight">
      <div class="o-general-data-panel__scrollable-wrapper">
        <header class="o-general-data-panel__ibox-title--editor-mode">
          <p class="o-general-data-panel__header">Workflow name:</p>
          <div *ngIf="disabledMode">
            <p class="o-general-data-panel__label">{{ name || 'No name' }}</p>
          </div>
          <div *ngIf="!disabledMode">
            <div *ngIf="!editableInputs.name">
              <p class="o-general-data-panel__label o-general-data-panel__editable-text gdp-tip"
                 (click)="enableEdition('name')">
                {{ name || 'Enter workflow name' }}
                <span class="gdp-tip__tooltip" *ngIf="name">Edit workflow name</span>
              </p>
            </div>
            <div *ngIf="editableInputs.name">
              <input class="form-control o-general-data-panel__editable-input"
                     [value]="buffer.name"
                     (input)="buffer.name = $any($event.target).value"
                     (blur)="hideInput('name')"
                     (keydown)="saveNewValue($event, 'name')"
                     [focus-element]="editableInputs.name" />
              <span class="o-general-data-panel__editable-info">
                Press esc to <a href="" (click)="hideInput('name'); $event.preventDefault()">Cancel</a>
              </span>
            </div>
          </div>
        </header>

        <section class="ibox-content o-general-data-panel__content" custom-scroll-bar>
          <header>
            <p class="o-general-data-panel__header">Description:</p>
            <div *ngIf="disabledMode">
              <p class="o-general-data-panel__label">{{ description || 'No description' }}</p>
            </div>
            <div *ngIf="!disabledMode">
              <div *ngIf="!editableInputs.description">
                <p class="o-general-data-panel__label o-general-data-panel__editable-text gdp-tip"
                   (click)="enableEdition('description')">
                  {{ description || 'Enter description' }}
                  <span class="gdp-tip__tooltip" *ngIf="name">Edit description</span>
                </p>
              </div>
              <div *ngIf="editableInputs.description">
                <input class="form-control o-general-data-panel__editable-input"
                       [value]="buffer.description"
                       (input)="buffer.description = $any($event.target).value"
                       (blur)="hideInput('description')"
                       (keydown)="saveNewValue($event, 'description')"
                       [focus-element]="editableInputs.description" />
                <span class="o-general-data-panel__editable-info">
                  Press esc to <a href="" (click)="hideInput('description'); $event.preventDefault()">Cancel</a>
                </span>
              </div>
            </div>
          </header>
        </section>

        <section class="ibox-content o-general-data-panel__content">
          <header>
            <p class="o-general-data-panel__header">Schedules:</p>
          </header>
        </section>

        <section *ngIf="publicParams?.length > 0">
          <public-params-list
            [workflow]="workflow"
            [publicParams]="publicParams"
            (publicParamsChange)="onPublicParamsChange($event)"
          ></public-params-list>
        </section>
      </div>
    </aside>
  `,
  styles: [`
    .gdp-tip { position: relative; }
    .gdp-tip__tooltip {
      display: none; position: absolute; right: 100%; top: 0; margin-right: 8px; white-space: nowrap;
      z-index: 1000; padding: 6px 10px; background: #fff; color: #333; font-size: 12px;
      border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.25);
    }
    .gdp-tip:hover .gdp-tip__tooltip { display: block; }
  `]
})
export class GeneralDataPanelComponent {
  @Input() workflow: any;
  @Input() disabledMode: boolean;
  @Input() name: string;
  @Output() nameChange = new EventEmitter<string>();
  @Input() description: string;
  @Output() descriptionChange = new EventEmitter<string>();
  @Input() publicParams: any;
  @Output() publicParamsChange = new EventEmitter<any>();

  editableInputs = { name: false, description: false };
  buffer = { name: '', description: '' };

  showInput(input: string): void { (this.editableInputs as any)[input] = true; }
  hideInput(input: string): void { (this.editableInputs as any)[input] = false; }

  enableEdition(input: string): void {
    this.showInput(input);
    (this.buffer as any)[input] = (this as any)[input];
  }

  saveNewValue(event: any, input: string): void {
    if (event.keyCode === ENTER_KEY_CODE) {
      (this as any)[input] = (this.buffer as any)[input];
      // Propagate the edited value up (legacy two-way binding).
      if (input === 'name') { this.nameChange.emit(this.name); }
      else if (input === 'description') { this.descriptionChange.emit(this.description); }
      this.hideInput(input);
    } else if (event.keyCode === ESCAPE_KEY_CODE) {
      this.hideInput(input);
    }
  }

  onPublicParamsChange(publicParams: any): void {
    this.publicParams = publicParams;
    this.publicParamsChange.emit(publicParams);
  }
}
