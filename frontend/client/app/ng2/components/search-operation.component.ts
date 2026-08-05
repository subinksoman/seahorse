/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Component, Input, Output, EventEmitter } from '@angular/core';
import '../../workflows/operations-catalogue/search-operation/search-operation.less';

// Phase C / operations-catalogue: migrated from workflows/operations-catalogue/search-operation. Pure
// presentational — renders the category/subcategory/operation tree of search results. The legacy `&`
// output selectOperation({operationId}) becomes an @Output emitting the operation id. Used only inside the
// (Angular) operation-catalogue template, so it is declared but NOT downgraded. The legacy `!$ctrl.message`
// guard was dead (message was never set) and is dropped.
@Component({
  standalone: false,
  selector: 'search-operation',
  template: `
    <div class="search-operation">
      <div *ngIf="!searchResults" class="message">
        There are no operations matching query
      </div>

      <div class="category" *ngFor="let category of searchResults?.catalog">
        <div class="category__name">{{ category.name }}</div>

        <div class="operations" *ngFor="let operation of category.items"
             (click)="selectOperation.emit(operation.id)">
          <div class="operations__name" [title]="operation.name">{{ operation.name }}</div>
        </div>

        <div class="subcategory" *ngFor="let subcategory of category.catalog">
          <div class="subcategory__name">{{ subcategory.name }}</div>

          <div class="operations" *ngFor="let operation of subcategory.items"
               (click)="selectOperation.emit(operation.id)">
            <div class="operations__name">{{ operation.name }}</div>
          </div>

          <div class="subcategory__inner-subcategory" *ngFor="let innerSub of subcategory.catalog">
            <div class="subcategory__name">{{ innerSub.name }}</div>
            <div class="operations" *ngFor="let operation of innerSub.items"
                 (click)="selectOperation.emit(operation.id)">
              <div class="operations__name" [title]="operation.name">{{ operation.name }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class SearchOperationComponent {
  @Input() searchResults: any;
  @Output() selectOperation = new EventEmitter<any>();
}
