/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import * as _ from 'lodash';
import '../workflows/operations-catalogue/operations-catalogue.less';

// Phase C / operations-catalogue: migrated from workflows/operations-catalogue (component + controller).
// The cap of the operations-catalogue cluster: shows the recursive operations-list, or the flat
// search-operation results when the query is > 2 chars. The legacy $scope.$watch(query) becomes ngOnChanges
// on the query input; $onChanges(categories) tagging is folded in. angular.copy -> _.cloneDeep. The two `&`
// outputs become @Outputs. This is the ONE component of the cluster used from an AngularJS template
// (new-node.html), so it is downgraded as directive 'operationCatalogue' (its two children are Angular-only).
@Component({
  standalone: false,
  selector: 'operation-catalogue',
  template: `
    <div class="operations-catalogue" [ngClass]="{ 'operations-catalogue--filtered': isSearchMode }">
      <operations-list
        *ngIf="!isSearchMode"
        [containment]="containment"
        [items]="categories"
        (selectOperation)="selectOperation.emit($event)"
      ></operations-list>

      <search-operation
        *ngIf="isSearchMode"
        [searchResults]="filteredCategories"
        (selectOperation)="selectOperation.emit($event)"
      ></search-operation>
    </div>
  `
})
export class OperationsCatalogueComponent implements OnChanges {
  @Input() categories: any;
  @Input() containment: any;
  @Input() query: string;
  // eslint-disable-next-line @angular-eslint/no-output-on-prefix — legacy contract name kept for parent parity.
  @Output() onUpdate = new EventEmitter<any>();
  @Output() selectOperation = new EventEmitter<any>();

  isSearchMode = false;
  filteredCategories: any;

  ngOnChanges(changes: SimpleChanges): void {
    // categories first: onQueryChange() below reads this.categories to build the search tree.
    if (changes.categories && changes.categories.currentValue) {
      this.categories = changes.categories.currentValue.map((category: any) => {
        return Object.assign({}, category, { type: 'category' });
      });
    }
    if (changes.query) {
      this.onQueryChange(this.query);
    }
  }

  private onQueryChange(query: any): void {
    this.isSearchMode = !!(query && query.length > 2);
    if (this.isSearchMode) {
      const tree = { catalog: this.categories, items: [] };
      this.filteredCategories = this.filterCatalog(tree, query);
    }
  }

  //TODO use Operation.filterCatalog(fn)
  filterCatalog(tree: any, filterQuery: string): any {
    const newTree = _.cloneDeep(tree);
    newTree.catalog = _
      .chain(newTree.catalog)
      .map((c: any) => this.filterCatalog(c, filterQuery))
      .filter((c: any) => !_.isNull(c))
      .value();
    newTree.items = _.filter(newTree.items, (item: any) => {
      return item.name.toLowerCase().includes(filterQuery.toLowerCase());
    });
    if (newTree.catalog.length === 0 && newTree.items.length === 0) {
      return null;
    }
    return newTree;
  }
}
