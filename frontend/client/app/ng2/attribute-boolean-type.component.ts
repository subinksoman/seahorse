/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Component, Input, OnInit } from '@angular/core';

// Phase C / deepsense-attributes: migrated from attribute-types/attribute-boolean. A boolean node parameter.
// Downgraded 'attributeBooleanType'; attributes-list passes [parameter]. The legacy `ui-switch` toggle
// directive can't live in an Angular template, so it is reimplemented as a self-contained CSS switch
// (green on / grey off, matching the ui-switch colours) — no external toggle-library sync fragility.
// valueBuffer <- parameter.getValueOrDefault(); on toggle, parameter.value <- buffer (only when it differs
// from the default, matching the legacy $watch).
@Component({
  standalone: false,
  selector: 'attribute-boolean-type',
  template: `
    <div>
      <label class="ds-switch">
        <input type="checkbox" [checked]="valueBuffer" (change)="onToggle($event)">
        <span class="ds-switch__slider"></span>
      </label>
    </div>
  `,
  styles: [`
    .ds-switch { position: relative; display: inline-block; width: 34px; height: 18px; margin: 0; }
    .ds-switch input { opacity: 0; width: 0; height: 0; position: absolute; }
    .ds-switch__slider {
      position: absolute; cursor: pointer; inset: 0; background: #E43B11; border-radius: 18px;
      transition: background .2s;
    }
    .ds-switch__slider::before {
      content: ''; position: absolute; height: 14px; width: 14px; left: 2px; top: 2px;
      background: #fff; border-radius: 50%; transition: transform .2s;
    }
    .ds-switch input:checked + .ds-switch__slider { background: #1ab394; }
    .ds-switch input:checked + .ds-switch__slider::before { transform: translateX(16px); }
  `]
})
export class AttributeBooleanTypeComponent implements OnInit {
  @Input() parameter: any;
  valueBuffer = false;

  ngOnInit(): void {
    this.valueBuffer = this.parameter ? this.parameter.getValueOrDefault() : false;
  }

  onToggle(event: any): void {
    this.valueBuffer = event.target.checked;
    if (this.parameter && this.valueBuffer !== this.parameter.getValueOrDefault()) {
      this.parameter.value = this.valueBuffer;
    }
  }
}
