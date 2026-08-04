/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Component, Inject } from '@angular/core';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import * as _ from 'lodash';

// Phase C / AngularJS removal: the column-selector picker modal on CDK/ModalService. Folds the whole
// former shared-$scope subsystem (attribute-selector-type-modal.html + selector-items[type-list/index
// -list/column-list] + calculated-selected-columns) into ONE self-contained component — so no $scope is
// shared across sub-components. Library replacements: uib-btn-radio -> native buttons, ui-switch ->
// checkbox, angucomplete-alt -> a native filtered list, min-value/max-value -> native number inputs.
@Component({
  standalone: false,
  template: `
    <div class="modal-content">
      <header class="modal-header u-flex u-flex--center-center">
        <h3 class="no-margins">Selection for:</h3>
        <span class="text-uppercase text-success u-as-h3 u-space u-flex__1">{{ parameter.name }}</span>
        <div *ngIf="!selectorIsSingle()">
          <span class="font-bold">Mode:</span>
          <div class="btn-group">
            <label class="btn btn-sm btn-info" [ngClass]="{'active': !parameter.excluding}"
                   title="Selects following columns" (click)="parameter.excluding = false">Including</label>
            <label class="btn btn-sm btn-info" [ngClass]="{'active': parameter.excluding}"
                   title="Select all columns, excluding following" (click)="parameter.excluding = true">Excluding</label>
          </div>
        </div>
      </header>

      <article class="modal-body u-flex o-modal-selector__main-panel">
        <section class="o-modal-selector__item u-flex__1" *ngFor="let itemType of itemTypes"
                 [hidden]="itemType.id === 'indexRange' && isItemIdInList('indexRange')">
          <h4 class="text-center">{{ itemType.verbose }}</h4>

          <div class="o-modal-selector__list--empty text-navy fa fa-plus-circle fa-5x
                      u-flex u-flex--center-center u-fill-parent u-cursor-pointer"
               [ngClass]="{'o-modal-selector__list--single fa-arrows-h': selectorIsSingle()}"
               [hidden]="isItemIdInList(itemType.id)"
               (click)="selectorIsSingle() ? switchItem(itemType) : addItem(itemType.id)"></div>

          <div *ngFor="let item of getItemsThisType(itemType.id)" [hidden]="!isItemIdInList(itemType.id)"
               class="o-modal-selector__list o-modal-selector__list--{{ itemType.id.toLowerCase() }}">

            <!-- typeList -->
            <div class="types-list-selector" *ngIf="itemType.id === 'typeList'">
              <a class="close-link close-link--types-list m-r-sm" aria-label="Close" (click)="removeTypesList(item)">
                <i class="fa fa-times"></i>
              </a>
              <div *ngFor="let typeName of typeNames(item)">
                <label class="u-flex u-cursor-pointer types-list-selector__label">
                  <span class="u-flex__1">{{ typeName }}</span>
                  <input type="checkbox" [checked]="item.types[typeName]"
                         (change)="item.types[typeName] = $any($event.target).checked"/>
                </label>
              </div>
            </div>

            <!-- index -->
            <ng-container *ngIf="itemType.id === 'index'">
              <div class="index-list-selector-item u-flex u-flex--center-center m-b-sm" *ngIf="selectorIsSingle()">
                <input type="number" placeholder="Index" min="0" [attr.max]="maxIndex"
                       class="form-control o-custom index-list-selector-item__input single-selector"
                       [value]="item.firstNum" (input)="item.firstNum = num($event)"/>
              </div>
            </ng-container>

            <!-- column / columnList -->
            <div *ngIf="itemType.id === 'column' || itemType.id === 'columnList'">
              <div *ngIf="selectorIsSingle()">
                <ng-container *ngTemplateOutlet="colSearch; context: { item: item }"></ng-container>
              </div>
              <div *ngIf="!selectorIsSingle()">
                <div *ngIf="!hasSchema()">
                  <div class="u-flex u-flex--center-center m-b-sm">
                    <input [value]="item.name || ''" (input)="item.name = $any($event.target).value"
                           placeholder="Enter column name" type="text" class="form-control o-custom"/>
                  </div>
                  <button class="btn btn-info btn-xs o-action-text" type="button"
                          [disabled]="!item.name" (click)="addColumn(item)">
                    <i class="fa fa-plus"></i><span>Add name</span>
                  </button>
                </div>
                <ng-container *ngIf="hasSchema()">
                  <ng-container *ngTemplateOutlet="colSearch; context: { item: item }"></ng-container>
                </ng-container>
                <span class="badge o-tag-unit" *ngFor="let column of item.columns; let ci = index"
                      [ngClass]="isColumnValid(item, column) ? 'badge-info' : 'badge-danger'">
                  <span class="o-tag-unit__name">{{ column.name }}</span>
                  <a class="close o-tag-unit__close" (click)="removeColumn(item, ci)">&times;</a>
                </span>
              </div>
            </div>
          </div>
        </section>

        <!-- index range -->
        <section class="o-modal-selector__item u-flex__1" [hidden]="!isItemIdInList('indexRange')">
          <h4 class="text-center">Index range</h4>
          <section class="o-modal-selector__list o-modal-selector__list--index">
            <form style="flex: 1" (submit)="addIndex(); $event.preventDefault()" *ngIf="!selectorIsSingle()">
              <div class="u-flex u-flex--center-center m-b-sm range-selector">
                <input type="number" placeholder="From" min="0" class="form-control o-custom index-list-selector-item__input"
                       [attr.max]="indexBuffer.secondNum || maxIndex"
                       [value]="indexBuffer.firstNum" (input)="indexBuffer.firstNum = num($event)"/>
                <input type="number" placeholder="To" min="0" class="form-control o-custom index-list-selector-item__input"
                       [attr.max]="maxIndex"
                       [value]="indexBuffer.secondNum" (input)="indexBuffer.secondNum = num($event)"/>
              </div>
              <button class="btn btn-info btn-xs o-action-text" type="submit"
                      [disabled]="indexBuffer.firstNum === undefined || indexBuffer.secondNum === undefined">
                <i class="fa fa-plus"></i><span>Add index</span>
              </button>
              <div>
                <span class="badge badge-default o-tag-unit" *ngFor="let range of visibleRanges()"
                      [ngClass]="isRangeValid(range) ? 'badge-default' : 'badge-danger'">
                  <span>{{ range.firstNum }}</span><span> - </span>
                  <span class="o-tag-unit__name">{{ range.secondNum }}</span>
                  <a class="close o-tag-unit__close" (click)="removeIndex(range)">&times;</a>
                </span>
              </div>
            </form>
          </section>
        </section>
      </article>

      <article class="modal-body u-flex calculated-columns">
        <span *ngIf="parameter.dataFrameSchema">
          <div class="o-modal-selector__show-all-checkbox">
            <label class="custom-checkbox rtl">
              <input type="checkbox" [checked]="showAllColumns" (change)="showAllColumns = $any($event.target).checked">
              <span class="font-bold">Show all</span>
            </label>
          </div>
          <strong>Selected column<span *ngIf="!selectorIsSingle()">s</span>:</strong>
          <section class="calculated-selected-columns-panel">
            <ng-container *ngIf="showAllColumns">
              <span *ngFor="let column of allColumns()">
                <span class="badge o-tag-unit o-tag-unit__name"
                      [ngClass]="isSelected(column) ? 'badge-info' : 'badge-default'">{{ column.name }}</span>
              </span>
            </ng-container>
            <ng-container *ngIf="!showAllColumns">
              <span *ngFor="let column of calculatedColumns()">
                <span class="badge o-tag-unit o-tag-unit__name badge-info" *ngIf="isSelected(column)">{{ column.name }}</span>
                <span class="badge o-tag-unit o-tag-unit__name badge-default" *ngIf="!isSelected(column)">...</span>
              </span>
              <span *ngIf="calculatedColumns().length === 0">None</span>
            </ng-container>
          </section>
        </span>
        <span *ngIf="!parameter.dataFrameSchema">
          Actual selected columns cannot be calculated because DataFrame schema is not known.
          <br/>Partially execute workflow to bring schema to the selector.
        </span>
      </article>

      <footer class="modal-footer">
        <button class="btn btn-sm btn-info" type="button" (click)="done()">Done</button>
      </footer>
    </div>

    <ng-template #colSearch let-item="item">
      <div class="autocomplete-wrapper">
        <input [value]="columnSearch" (input)="columnSearch = $any($event.target).value"
               placeholder="Search names..." type="text" class="form-control o-custom"/>
        <div class="autocomplete-list" *ngIf="columnSearch">
          <div class="autocomplete-list__item" *ngFor="let f of filteredFields()"
               (click)="addColumnByName(item, f.name)">{{ f.name }}</div>
        </div>
      </div>
    </ng-template>
  `
})
export class ColumnSelectorModalComponent {
  parameter: any;
  itemTypes: any[];
  private selectorItemFactory: any;
  showAllColumns = false;
  columnSearch = '';
  indexBuffer: { firstNum: any; secondNum: any } = { firstNum: undefined, secondNum: undefined };

  constructor(@Inject(DIALOG_DATA) data: any, private dialogRef: DialogRef<any>) {
    this.parameter = data.parameter;
    this.selectorItemFactory = this.parameter && this.parameter.factoryItem;
    if (this.selectorItemFactory) {
      const all = this.selectorItemFactory.getAllItemsTypes();
      this.itemTypes = this.selectorIsSingle() ? all.singleSelectorItems : all.multipleSelectorItems;
    }
  }

  // ---- from AttributeSelectorTypeComponent ----
  selectorIsSingle(): boolean {
    return !!(this.parameter && this.parameter.schema && this.parameter.schema.isSingle);
  }
  isEmptyParameter(parameter: any): boolean | undefined {
    switch (parameter.type.id) {
      case 'indexRange': return _.isUndefined(parameter.firstNum) || _.isUndefined(parameter.secondNum);
      case 'columnList': return parameter.columns.length === 0;
      case 'typeList': return !_.some(_.values(parameter.types));
      default: return undefined;
    }
  }
  isItemIdInList(id: any): any { return _.find(this.parameter.items, (l: any) => l.type.id === id); }
  getItemsThisType(id: any): any[] { return _.filter(this.parameter.items, (l: any) => l.type.id === id); }
  getCurrentItemIndex(item: any): number { return this.parameter.items.indexOf(item); }
  addItem(id: any): any {
    const item = this.selectorItemFactory.createItem({ type: id, values: [] });
    this.parameter.items.push(item);
    return item;
  }
  removeItem(itemIndex: number): void { this.parameter.items.splice(itemIndex, 1); }
  switchItem(item: any): void { this.parameter.items.splice(0, 1); this.addItem(item.id); }

  // ---- type-list ----
  typeNames(item: any): string[] { return Object.keys(item.types || {}); }
  removeTypesList(item: any): void { this.removeItem(this.getCurrentItemIndex(item)); }

  // ---- column-list ----
  hasSchema(): boolean { return !!(this.parameter.dataFrameSchema && this.parameter.dataFrameSchema.fields); }
  private invalidColumnsNames(item: any): any[] {
    const dfSchema = this.parameter.dataFrameSchema;
    if (!dfSchema) { return []; }
    return _.filter(item.columns, (column: any) => !dfSchema.fields.find((f: any) => f.name === column.name));
  }
  isColumnValid(item: any, column: any): boolean {
    return !this.invalidColumnsNames(item).find((elem: any) => elem === column);
  }
  addColumn(item: any): void {
    if (!item.name) { return; }
    item.addColumn(item.name);
    item.name = '';
  }
  addColumnByName(item: any, name: string): void {
    item.addColumn(name);
    this.columnSearch = '';
  }
  removeColumn(item: any, columnIndex: number): void {
    item.columns.splice(columnIndex, 1);
    if (item.columns.length === 0) { this.removeItem(this.getCurrentItemIndex(item)); }
  }
  filteredFields(): any[] {
    if (!this.hasSchema()) { return []; }
    const q = (this.columnSearch || '').toLowerCase();
    return this.parameter.dataFrameSchema.fields.filter((f: any) => f.name.toLowerCase().includes(q));
  }

  // ---- index-list ----
  get maxIndex(): any {
    return this.parameter.dataFrameSchema && this.parameter.dataFrameSchema.fields.length - 1;
  }
  num(event: any): any {
    const v = event.target.value;
    return v === '' ? undefined : Number(v);
  }
  visibleRanges(): any[] {
    return this.getItemsThisType('indexRange').filter((r: any) => !this.isEmptyParameter(r));
  }
  addIndex(): void {
    if (this.indexBuffer.firstNum === undefined || this.indexBuffer.secondNum === undefined) { return; }
    let allIndexes = this.getItemsThisType('indexRange');
    if (allIndexes.length === 0 || allIndexes[allIndexes.length - 1].secondNum !== undefined) {
      this.addItem('indexRange');
      allIndexes = this.getItemsThisType('indexRange');
    }
    Object.assign(allIndexes[allIndexes.length - 1], {
      firstNum: this.indexBuffer.firstNum, secondNum: this.indexBuffer.secondNum
    });
    this.indexBuffer = { firstNum: undefined, secondNum: undefined };
  }
  removeIndex(item: any): void { this.removeItem(this.getCurrentItemIndex(item)); }
  isRangeValid(range: any): boolean {
    return this.maxIndex === undefined ? true : range.secondNum <= this.maxIndex;
  }

  // ---- calculated-selected-columns ----
  private isFieldSelected(field: any, index: number, collection: any[]): boolean {
    const selected = _.some(this.parameter.items, (item: any) => item.containsField(field, index, collection.length));
    return this.parameter.excluding ? !selected : selected;
  }
  isSelected(field: any): boolean {
    const collection = this.parameter.dataFrameSchema.fields;
    return this.isFieldSelected(field, collection.indexOf(field), collection);
  }
  allColumns(): any[] { return this.parameter.dataFrameSchema.fields; }
  calculatedColumns(): any[] {
    const fields = this.parameter.dataFrameSchema.fields;
    let selectedIndices: number[] = [];
    _.forEach(fields, (field: any, index: number) => {
      if (this.isFieldSelected(field, index, fields)) { selectedIndices.push(index); }
    });
    if (selectedIndices.length > 0) { selectedIndices = this.withPlaceholders(selectedIndices, fields.length); }
    return _.filter(fields, (field: any, index: number) => _.includes(selectedIndices, index));
  }
  private withPlaceholders(selectedIndices: number[], fieldsLength: number): number[] {
    const placeholderIndices: number[] = [];
    let previousIndex = -1;
    for (let i = 0; i < selectedIndices.length; i++) {
      if (selectedIndices[i] !== previousIndex + 1) { placeholderIndices.push(selectedIndices[i] - 1); }
      previousIndex = selectedIndices[i];
    }
    placeholderIndices.push(fieldsLength - 1);
    const result = selectedIndices.concat(placeholderIndices);
    result.sort((a, b) => a - b);
    return result;
  }

  // ---- lifecycle ----
  private clearEmptyParameters(): void {
    _.forEachRight(this.parameter.items, (p: any, index: number) => {
      if (this.isEmptyParameter(p)) { this.removeItem(index); }
    });
  }
  done(): void {
    this.clearEmptyParameters();
    this.dialogRef.close();
  }
}
