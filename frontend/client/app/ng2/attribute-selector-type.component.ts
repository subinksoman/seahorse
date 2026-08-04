/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Component, Input, Inject, OnInit } from '@angular/core';
import * as _ from 'lodash';
import modalTpl from '../common/deepsense-components/deepsense-attributes-panel/attribute-types/attribute-column-selector/attribute-selector-type-modal.html';

// Phase C / deepsense-attributes: migrated from attribute-types/attribute-column-selector/attribute-selector
// -type (the column selector). Downgraded 'attributeSelectorType'; attributes-list passes [parameter]. Its
// inline template hosts the migrated <attributes-serialized-view> + an "Edit selection" button.
//
// KEY: the picker MODAL + its selector-items (column/index/type-list) + calculated-selected-columns stay
// AngularJS UNCHANGED. The legacy directive shared its own scope with the modal ($uibModal.open({scope})); a
// downgraded Angular component has no such scope, so openSelector() creates a fresh $rootScope child scope,
// populates it with `parameter` + the selector methods (bound to this component), and passes THAT to
// $uibModal — the AngularJS modal template reads it exactly as before, no rewrite. The scope is destroyed on
// modal close.
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
export class AttributeSelectorTypeComponent implements OnInit {
  @Input() parameter: any;

  itemTypes: any;
  private selectorItemFactory: any;

  constructor(
    @Inject('$rootScope') private $rootScope: any,
    @Inject('$uibModal') private $uibModal: any
  ) {}

  ngOnInit(): void {
    this.selectorItemFactory = this.parameter && this.parameter.factoryItem;
    if (this.selectorItemFactory) {
      const all = this.selectorItemFactory.getAllItemsTypes();
      this.itemTypes = this.selectorIsSingle() ? all.singleSelectorItems : all.multipleSelectorItems;
    }
  }

  selectorIsSingle(): boolean {
    return !!(this.parameter && this.parameter.schema && this.parameter.schema.isSingle);
  }

  openSelector(): void {
    const scope = this.$rootScope.$new();
    Object.assign(scope, {
      parameter: this.parameter,
      itemTypes: this.itemTypes,
      isEmptyParameter: (p: any) => this.isEmptyParameter(p),
      isItemIdInList: (id: any) => this.isItemIdInList(id),
      getItemsThisType: (id: any) => this.getItemsThisType(id),
      getItemsThisTypeOrDefault: (id: any) => this.getItemsThisTypeOrDefault(id),
      getCurrentItemIndex: (item: any) => this.getCurrentItemIndex(item),
      addItem: (id: any) => this.addItem(id),
      removeItem: (i: any) => this.removeItem(i),
      switchItem: (item: any) => this.switchItem(item),
      selectorIsSingle: () => this.selectorIsSingle(),
      showItemsChoices: () => this.showItemsChoices()
    });
    const modal = this.$uibModal.open({
      templateUrl: modalTpl,
      size: this.selectorIsSingle() ? 'md' : 'lg',
      scope,
      windowClass: 'selection-modal'
    });
    modal.result.finally(() => {
      this.clearEmptyParameters();
      scope.$destroy();
    });
  }

  private clearEmptyParameters(): void {
    _.forEachRight(this.parameter.items, (parameter: any, index: number) => {
      if (this.isEmptyParameter(parameter)) {
        this.removeItem(index);
      }
    });
  }

  isEmptyParameter(parameter: any): boolean | undefined {
    switch (parameter.type.id) {
      case 'indexRange':
        return _.isUndefined(parameter.firstNum) || _.isUndefined(parameter.secondNum);
      case 'columnList':
        return parameter.columns.length === 0;
      case 'typeList':
        return !_.some(_.values(parameter.types));
      default:
        return undefined;
    }
  }

  isItemIdInList(id: any): any {
    return _.find(this.parameter.items, (lists: any) => lists.type.id === id);
  }

  getItemsThisType(id: any): any[] {
    return _.filter(this.parameter.items, (lists: any) => lists.type.id === id);
  }

  getItemsThisTypeOrDefault(id: any): any[] {
    if ((this.selectorIsSingle() || !this.parameter.excluding) && _.isEmpty(this.parameter.items)) {
      return _.filter(this.parameter.defaultItems, (lists: any) => lists.type.id === id);
    }
    return this.getItemsThisType(id);
  }

  getCurrentItemIndex(item: any): number {
    return this.parameter.items.indexOf(item);
  }

  addItem(id: any): any {
    const selectorItem = this.selectorItemFactory.createItem({ type: id, values: [] });
    this.parameter.items.push(selectorItem);
    return selectorItem;
  }

  removeItem(itemIndex: number): void {
    this.parameter.items.splice(itemIndex, 1);
  }

  switchItem(item: any): void {
    this.parameter.items.splice(0, 1);
    this.addItem(item.id);
  }

  showItemsChoices(): boolean {
    const isSingle = this.selectorIsSingle();
    return !isSingle || (isSingle && this.parameter.items.length !== 1);
  }
}
