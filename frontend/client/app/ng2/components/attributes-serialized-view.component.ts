/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Component, Input } from '@angular/core';
import * as _ from 'lodash';

// Phase C / deepsense-attributes (column-selector): migrated from attribute-column-selector/
// attributes-serialized-view. The read-only summary of a column selector's current selection (mode, name/
// index/type lists). Used inside the (Angular) attribute-selector-type template -> declared, not downgraded.
// Was inherited-scope; now fully self-contained from @Input parameter (selectorIsSingle + getItemsThisType
// OrDefault inlined). uib-tooltip -> native title.
@Component({
  standalone: false,
  selector: 'attributes-serialized-view',
  template: `
    <ul class="list-unstyled" *ngIf="parameter && (parameter.excluding || parameter.items.length || parameter.defaultItems.length)">
      <li *ngIf="!selectorIsSingle()">
        <span class="font-bold">Mode:</span>
        <span class="label label-sm label-info" *ngIf="isIncluding()" title="Selects the following columns">Including</span>
        <span class="label label-sm label-info" *ngIf="isExcluding()" title="Select all columns, excluding the following ones">Excluding</span>
      </li>
      <li *ngIf="parameter.excluding && parameter.items.length === 0"><span>All columns are selected.</span></li>
      <li *ngIf="getNamesList()">
        <p class="m-b-none">Names list:</p>
        <span *ngFor="let listItem of getNamesList()" class="badge badge-info u-inline-block u-inline-block--spaced">{{ listItem.name || '&nbsp;' }}</span>
      </li>
      <li *ngIf="getIndexList().length">
        <p class="m-b-none">Index range:</p>
        <span class="badge badge-info u-inline-block u-inline-block--spaced" *ngFor="let indexRangeItem of getIndexList()">
          {{ indexRangeItem.firstNum >= 0 && indexRangeItem.firstNum !== null ? indexRangeItem.firstNum : '&nbsp;' }}
          <span *ngIf="indexRangeItem.firstNum >= 0 && indexRangeItem.firstNum !== null && indexRangeItem.secondNum >= 0 && indexRangeItem.secondNum !== null">- {{ indexRangeItem.secondNum }}</span>
        </span>
      </li>
      <li *ngIf="getTypesList()">
        <p class="m-b-none">Types list:</p>
        <ng-container *ngFor="let entry of getTypesList() | keyvalue">
          <span class="badge badge-info u-inline-block u-inline-block--spaced" *ngIf="entry.value">{{ entry.key }}</span>
        </ng-container>
      </li>
      <li *ngIf="selectorIsSingle() && getName()" class="u-flex u-flex__wrap">
        <p class="m-b-none u-flex__1 u-flex__25">{{ getSingleValueOrDefault().type.verbose }}:</p>
        <span class="badge badge-info u-inline-block u-inline-block--spaced">{{ getName() }}</span>
      </li>
      <li *ngIf="selectorIsSingle() && (getIndex() >= 0 && getIndex() !== null)" class="u-flex u-flex__wrap">
        <p class="m-b-none u-flex__1">{{ getSingleValueOrDefault().type.verbose }}:</p>
        <span class="badge badge-info u-inline-block u-inline-block--spaced">{{ getIndex() }}</span>
      </li>
    </ul>
  `
})
export class AttributesSerializedViewComponent {
  @Input() parameter: any;

  selectorIsSingle(): boolean {
    return !!(this.parameter && this.parameter.schema && this.parameter.schema.isSingle);
  }

  getItemsThisTypeOrDefault(id: string): any[] {
    if (!this.parameter) { return []; }
    if ((this.selectorIsSingle() || !this.parameter.excluding) && _.isEmpty(this.parameter.items)) {
      return _.filter(this.parameter.defaultItems, (lists: any) => lists.type.id === id);
    }
    return _.filter(this.parameter.items, (lists: any) => lists.type.id === id);
  }

  getNamesList(): any {
    const columnListObject = this.getItemsThisTypeOrDefault('columnList')[0];
    return columnListObject && columnListObject.columns;
  }

  getIndexList(): any[] {
    return this.getItemsThisTypeOrDefault('indexRange');
  }

  getTypesList(): any {
    const typesList = this.getItemsThisTypeOrDefault('typeList')[0];
    if (typesList && typesList.types) {
      return _.some(_.values(typesList.types)) ? typesList.types : null;
    }
    return null;
  }

  getName(): any {
    const nameObj = this.getItemsThisTypeOrDefault('column')[0];
    return nameObj && nameObj.column.name;
  }

  getIndex(): any {
    const nameObj = this.getItemsThisTypeOrDefault('index')[0];
    return nameObj && nameObj.firstNum >= 0 && !_.isNull(nameObj.firstNum) ? nameObj.firstNum : null;
  }

  isValueEmpty(): boolean {
    return (this.selectorIsSingle() || !this.parameter.excluding) && _.isEmpty(this.parameter.items);
  }

  getSingleValueOrDefault(): any {
    return this.isValueEmpty() ? this.parameter.defaultItems[0] : this.parameter.items[0];
  }

  isExcluding(): boolean {
    return this.parameter.excluding || (this.isValueEmpty() && this.parameter.defaultExcluding);
  }

  isIncluding(): boolean {
    return !this.isExcluding();
  }
}
