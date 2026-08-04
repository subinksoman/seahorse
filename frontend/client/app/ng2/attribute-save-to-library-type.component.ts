/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Component, Input } from '@angular/core';
import { LibraryModalService } from './library-modal.service';

// Phase C / deepsense-attributes: migrated from attribute-types/attribute-save-to-library. Text field + a
// "Place in library" link that opens the write-to-file library modal. Downgraded 'attributeSaveToLibrary';
// attributes-list passes [parameter]. Injects the already-migrated Angular LibraryModalService.
@Component({
  standalone: false,
  selector: 'attribute-save-to-library',
  template: `
    <div class="save-to-library">
      <div class="link" (click)="openLibrary(parameter?.value)">
        <i class="fa fa-list icon"></i>
        <span>Place in library</span>
      </div>
      <input type="text" class="form-control"
             [ngClass]="{ 'invalid-param-value': parameter && !parameter.validate() }"
             [value]="parameter?.value"
             (input)="onInput($event)"
             [placeholder]="parameter?.defaultValue">
    </div>
  `
})
export class AttributeSaveToLibraryTypeComponent {
  @Input() parameter: any;

  constructor(private libraryModalService: LibraryModalService) {}

  openLibrary(params: any): void {
    this.libraryModalService.openLibraryModal('write-to-file', params).then((result: any) => {
      if (result && this.parameter) {
        this.parameter.value = result;
      }
    });
  }

  onInput(event: any): void {
    if (this.parameter) {
      this.parameter.value = event.target.value;
    }
  }
}
