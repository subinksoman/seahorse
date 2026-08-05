/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Component, Input } from '@angular/core';

// Phase C / deepsense-attributes: migrated from attribute-types/attribute-load-from-library. Wraps the
// migrated <library-connector> (pick a file -> writes the uri back) plus a text field, both editing
// parameter.value. Downgraded 'attributeLoadFromLibrary'; attributes-list passes [parameter].
@Component({
  standalone: false,
  selector: 'attribute-load-from-library',
  template: `
    <div>
      <library-connector [fileUri]="parameter?.value" (fileUriChange)="setValue($event)"></library-connector>
      <input type="text" class="form-control"
             [ngClass]="{ 'invalid-param-value': parameter && !parameter.validate() }"
             [value]="parameter?.value"
             (input)="onInput($event)"
             [placeholder]="parameter?.defaultValue">
    </div>
  `
})
export class AttributeLoadFromLibraryTypeComponent {
  @Input() parameter: any;

  setValue(uri: any): void {
    if (this.parameter) {
      this.parameter.value = uri;
    }
  }

  onInput(event: any): void {
    if (this.parameter) {
      this.parameter.value = event.target.value;
    }
  }
}
