/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Component, Input, OnInit } from '@angular/core';
import * as _ from 'lodash';

// Phase C / deepsense-attributes recursive core: migrated from attribute-types/attribute-multiplier.
// Repeatable groups of sub-parameters, each rendered via a nested <attributes-list>. $compile -> Angular
// recursion. Add/remove group.
@Component({
  standalone: false,
  selector: 'attribute-multiplier-type',
  template: `
    <div class="multiplier-panel">
      <div class="nested-attributes-view nested-attributes-view--multiplier">
        <div class="ibox multiplier-item" *ngFor="let parametersList of parameter?.parametersLists; let i = index">
          <div class="ibox-title">
            <span class="ibox-title--multiplier">Group #{{ i + 1 }}</span>
            <a class="close-link" aria-label="Close" (click)="removeItem(i)"><i class="fa fa-times"></i></a>
          </div>
          <div class="ibox-content">
            <attributes-list [parametersList]="parametersList"></attributes-list>
          </div>
        </div>
      </div>
      <div class="action-button-wrapper action-button-wrapper--no-bottom-margin">
        <button class="btn btn-info btn-xs o-action-text" type="button" (click)="addItem()">
          <i class="fa fa-plus"></i><span>Add group</span>
        </button>
      </div>
    </div>
  `
})
export class AttributeMultiplierTypeComponent implements OnInit {
  @Input() parameter: any;

  ngOnInit(): void {
    if (this.parameter && this.parameter.parametersLists.length === 0) {
      this.addItem();
    }
  }

  addItem(): void {
    this.parameter.parametersLists.push(_.cloneDeep(this.parameter.emptyItem));
  }

  removeItem(itemIndex: number): void {
    if (window.confirm('Are you sure to remove the multiplier item?')) {
      this.parameter.parametersLists.splice(itemIndex, 1);
    }
  }
}
