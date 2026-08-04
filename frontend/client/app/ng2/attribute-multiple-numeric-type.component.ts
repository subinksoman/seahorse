/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Component, Input, OnInit } from '@angular/core';

// Phase C / deepsense-attributes: migrated from attribute-types/attribute-multiple-numeric. A text field
// editing a multi-numeric parameter through its raw-string form (parseRawValue/validateValue/rawValue).
// Downgraded 'attributeMultipleNumericType'; attributes-list passes [parameter]. ng-model(rawValue) ->
// [value]/(input); validateRawValue guarded.
@Component({
  standalone: false,
  selector: 'attribute-multiple-numeric-type',
  template: `
    <input type="text" class="form-control"
           [ngClass]="{ 'invalid-param-value': parameter && !parameter.validateRawValue(rawValue) }"
           [value]="rawValue"
           (input)="onInput($event)"
           [placeholder]="parameter && parameter.convertToRawValue(parameter.defaultValue)">
  `
})
export class AttributeMultipleNumericTypeComponent implements OnInit {
  @Input() parameter: any;
  rawValue: any;

  ngOnInit(): void {
    this.rawValue = this.parameter ? this.parameter.rawValue() : '';
  }

  onInput(event: any): void {
    this.rawValue = event.target.value;
    if (!this.parameter) {
      return;
    }
    const value = this.parameter.parseRawValue(this.rawValue);
    this.parameter.value = this.parameter.validateValue(value) ? value : null;
  }
}
