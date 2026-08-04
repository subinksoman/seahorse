/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Component, Input } from '@angular/core';
import { ModalService } from './modal.service';
import { ColumnSelectorModalComponent } from './column-selector-modal.component';

// Phase C / deepsense-attributes: the column selector. Downgraded 'attributeSelectorType'; attributes
// -list passes [parameter]. Hosts the migrated <attributes-serialized-view> + an "Edit selection"
// button that opens the CDK ColumnSelectorModalComponent (the whole former shared-$scope subsystem is
// folded into that one component now — no $uibModal / child-scope).
@Component({
  standalone: false,
  selector: 'attribute-selector-type',
  template: `
    <div class="selector-type-parameter">
      <section class="o-selected-items">
        <attributes-serialized-view [parameter]="parameter"></attributes-serialized-view>
        <button class="btn btn-info btn-xs o-action-text add-selector-item"
                (click)="openSelector()">Edit selection</button>
      </section>
    </div>
  `
})
export class AttributeSelectorTypeComponent {
  @Input() parameter: any;

  constructor(private modal: ModalService) {}

  openSelector(): void {
    const single = !!(this.parameter && this.parameter.schema && this.parameter.schema.isSingle);
    this.modal.open(ColumnSelectorModalComponent, { parameter: this.parameter },
      { panelClass: single ? ['ds-modal-panel', 'selection-modal'] : ['ds-modal-panel', 'ds-modal-lg', 'selection-modal'] });
  }
}
