/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Component, Input, Output, EventEmitter } from '@angular/core';
import * as _ from 'lodash';
import '../../../components/datasources/datasources-list/datasources-list.less';

// Phase C / datasources subsystem: migrated from components/datasources/datasources-list. Sortable header +
// the list of datasources-element rows. Used only inside the (Angular) datasources-panel template, so it is
// declared but NOT downgraded. The `| orderBy:type:order` filter -> lodash _.orderBy getter (order===true is
// AngularJS reverse=descending). Embeds the migrated <datasources-element>.
@Component({
  standalone: false,
  selector: 'datasources-list',
  template: `
    <div class="datasources-list">
      <div class="datasources-list__header">
        <div class="datasources-list__type">
          <span class="datasources-list__descending-icon sa-sort-desc sa"
                [ngClass]="{ 'datasources-list__descending-icon--active': filterType == 'params.datasourceType' && filterOrder == false }"
                (click)="sort('params.datasourceType', false)"></span>
          <span class="datasources-list__descending-icon sa-sort-asc sa"
                [ngClass]="{ 'datasources-list__descending-icon--active': filterType == 'params.datasourceType' && filterOrder == true }"
                (click)="sort('params.datasourceType', true)"></span>
        </div>
        <div class="datasources-list__name">
          <span class="datasources-list__text">Name</span>
          <span class="datasources-list__descending-icon sa-sort-desc sa"
                [ngClass]="{ 'datasources-list__descending-icon--active': filterType == 'params.name' && filterOrder == false }"
                (click)="sort('params.name', false)"></span>
          <span class="datasources-list__descending-icon sa-sort-asc sa"
                [ngClass]="{ 'datasources-list__descending-icon--active': filterType == 'params.name' && filterOrder == true }"
                (click)="sort('params.name', true)"></span>
        </div>
        <div class="datasources-list__created">
          <span class="datasources-list__text">Created</span>
          <span class="datasources-list__descending-icon sa-sort-desc sa"
                [ngClass]="{ 'datasources-list__descending-icon--active': filterType == 'creationDateTime' && filterOrder == false }"
                (click)="sort('creationDateTime', false)"></span>
          <span class="datasources-list__descending-icon sa-sort-asc sa"
                [ngClass]="{ 'datasources-list__descending-icon--active': filterType == 'creationDateTime' && filterOrder == true }"
                (click)="sort('creationDateTime', true)"></span>
        </div>
        <div class="datasources-list__owner">
          <span class="datasources-list__text">Owner</span>
          <span class="datasources-list__descending-icon sa-sort-desc sa"
                [ngClass]="{ 'datasources-list__descending-icon--active': filterType == 'ownerName' && filterOrder == false }"
                (click)="sort('ownerName', false)"></span>
          <span class="datasources-list__descending-icon sa-sort-asc sa"
                [ngClass]="{ 'datasources-list__descending-icon--active': filterType == 'ownerName' && filterOrder == true }"
                (click)="sort('ownerName', true)"></span>
        </div>
        <div class="datasources-list__access">
          <span class="datasources-list__text">Access</span>
          <span class="datasources-list__descending-icon sa-sort-desc sa"
                [ngClass]="{ 'datasources-list__descending-icon--active': filterType == 'params.visibility' && filterOrder == false }"
                (click)="sort('params.visibility', false)"></span>
          <span class="datasources-list__descending-icon sa-sort-asc sa"
                [ngClass]="{ 'datasources-list__descending-icon--active': filterType == 'params.visibility' && filterOrder == true }"
                (click)="sort('params.visibility', true)"></span>
        </div>
      </div>
      <div class="datasources-list__list-wrapper">
        <datasources-element
          *ngFor="let datasource of sortedDatasources"
          [datasource]="datasource"
          [context]="context"
          (onSelect)="onSelect.emit($event)"
        ></datasources-element>
      </div>
    </div>
  `
})
export class DatasourcesListComponent {
  @Input() datasources: any;
  @Input() context: any;
  @Output() onSelect = new EventEmitter<any>();

  filterType = 'creationDateTime';
  filterOrder = true;

  get sortedDatasources(): any[] {
    if (!Array.isArray(this.datasources)) {
      return [];
    }
    return _.orderBy(this.datasources, [this.filterType], [this.filterOrder ? 'desc' : 'asc']);
  }

  sort(type: string, order: boolean): void {
    this.filterType = type;
    this.filterOrder = order;
  }
}
