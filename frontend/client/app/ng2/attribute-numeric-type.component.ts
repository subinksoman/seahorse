/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Component, Input, OnInit, DoCheck } from '@angular/core';

// Phase C / deepsense-attributes: migrated from attribute-types/attribute-numeric. Edits a numeric node
// parameter. Downgraded as directive 'attributeNumericType'; attributes-list passes [parameter]. Clean leaf
// (template had no custom directives). The two $watch value-buffer sync (parameter.value <-> valueBuffer,
// null on empty to avoid clobbering while typing '-'/'.') is inlined via ngDoCheck + (input); min/max/step
// derived once from the range validator. ng-model -> [value]/(input); parameter.validate() guarded.
@Component({
  standalone: false,
  selector: 'attribute-numeric-type',
  template: `
    <input type="number" class="form-control"
           [ngClass]="{ 'invalid-param-value': parameter && !parameter.validate() }"
           [value]="valueBuffer"
           (input)="onInput($event)"
           [placeholder]="parameter?.defaultValue"
           [attr.min]="min" [attr.max]="max" [attr.step]="step">
  `
})
export class AttributeNumericTypeComponent implements OnInit, DoCheck {
  @Input() parameter: any;
  valueBuffer: any;
  min: number | null = null;
  max: number | null = null;
  step: number | null = null;

  ngOnInit(): void {
    this.valueBuffer = this.parameter ? this.parameter.value : undefined;
    const validator = this.parameter && this.parameter.validator;
    if (validator && validator.schema && validator.schema.type === 'range') {
      const begin = validator.schema.configuration.begin;
      // Faithful to the legacy check (begin < -5e324 i.e. < -Infinity — effectively never sets min).
      if (begin < -5e+324) {
        this.min = begin;
      }
      this.max = validator.schema.configuration.end;
      this.step = validator.schema.configuration.step || 0.1;
    }
  }

  // Reflect external parameter.value changes into the buffer (legacy $watch('parameter.value')).
  ngDoCheck(): void {
    if (this.parameter && this.parameter.value !== this.valueBuffer) {
      this.valueBuffer = this.parameter.value;
    }
  }

  onInput(event: any): void {
    const raw = event.target.value;
    if (raw === '') {
      // type=number yields '' for a partial/invalid entry ('-', '.'); set null, not undefined.
      this.valueBuffer = undefined;
      if (this.parameter) { this.parameter.value = null; }
    } else {
      const num = Number(raw);
      this.valueBuffer = num;
      if (this.parameter) { this.parameter.value = num; }
    }
  }
}
