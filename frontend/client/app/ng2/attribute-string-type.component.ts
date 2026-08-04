/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Component, Input, OnInit } from '@angular/core';

// Phase C / deepsense-attributes PROOF-OF-PATTERN leaf: migrated from deepsense-attributes-panel/
// attribute-types/attribute-string. Edits a string node parameter. Downgraded as directive
// 'attributeStringType'; used in the (AngularJS) attributes-list ng-switch, which previously read the
// `parameter` off the inherited AngularJS scope — a downgraded Angular component cannot inherit that scope,
// so attributes-list now passes [parameter]. The tiny StringParamTypeService value-buffer sync is inlined
// (buffer <- parameter.value; on input, parameter.value <- buffer or null when empty). ng-model ->
// [value]/(input) (no @angular/forms). parameter.validate() is guarded (Angular throws where AngularJS was
// null-safe). This establishes the approach for the full ~38-component deepsense-attributes campaign.
@Component({
  standalone: false,
  selector: 'attribute-string-type',
  template: `
    <input type="text" class="form-control"
           [ngClass]="{ 'invalid-param-value': parameter && !parameter.validate() }"
           [value]="valueBuffer"
           (input)="onInput($event)"
           [placeholder]="parameter?.defaultValue">
  `
})
export class AttributeStringTypeComponent implements OnInit {
  @Input() parameter: any;
  valueBuffer: any;

  ngOnInit(): void {
    this.valueBuffer = this.parameter ? this.parameter.value : '';
  }

  onInput(event: any): void {
    const newValue = event.target.value;
    this.valueBuffer = newValue;
    if (this.parameter) {
      this.parameter.value = (newValue === '') ? null : newValue;
    }
  }
}
