/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Component, Input } from '@angular/core';

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
  // creator + prefixBasedCreator are byte-identical to string; one component serves all three selectors so
  // the (Angular) attributes-list dispatcher's <attribute-creator-type>/<attribute-prefix-based-creator-type>
  // resolve (downgrade names alone only work in AngularJS templates, not the Angular dispatcher).
  selector: 'attribute-string-type, attribute-creator-type, attribute-prefix-based-creator-type',
  template: `
    <input type="text" class="form-control"
           [ngClass]="{ 'invalid-param-value': parameter && !parameter.validate() }"
           [value]="parameter?.value == null ? '' : parameter.value"
           (input)="onInput($event)"
           [placeholder]="parameter?.defaultValue">
  `
})
export class AttributeStringTypeComponent {
  @Input() parameter: any;

  // Bind the input directly to the live parameter value (no cached buffer): a one-time
  // ngOnInit snapshot went stale when the parameter model was rebuilt/populated after init
  // (e.g. reopening a saved workflow), so the field showed null / the wrong value.
  onInput(event: any): void {
    if (this.parameter) {
      const newValue = event.target.value;
      this.parameter.value = (newValue === '') ? null : newValue;
    }
  }
}
