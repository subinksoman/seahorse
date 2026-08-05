/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Component, Input, Inject, OnInit, DoCheck } from '@angular/core';
import { ModalService } from '../modals/modal.service';
import { CellViewerModalComponent } from '../modals/cell-viewer-modal.component';
import { precision } from '../modals/report-chart-modal.component';

// Native port of the AngularJS 'cut' filter (common/filters/cut-words.js) — truncate to `max` chars,
// optionally at a word boundary, appending a tail. Replaces the bridged $filter('cut').
function cut(value: any, wordwise: boolean, max: any, tail?: string): any {
  if (!value) { return ''; }
  max = parseInt(max, 10);
  if (!max || value.length <= max) { return value; }
  value = value.substr(0, max);
  if (wordwise) {
    const lastspace = value.lastIndexOf(' ');
    if (lastspace !== -1) { value = value.substr(0, lastspace); }
  }
  return value + (tail || ' ...');
}

// The reports.controller EVENTS.SELECT_COLUMN string (inlined to avoid importing the AngularJS controller,
// which has registration side effects). Kept in sync with reports.controller.js.
const SELECT_COLUMN = 'select-column';

// Phase C / report subsystem (leaf): migrated from workflows/reports/report-table (directive + controller).
// The data-sample grid: sortable-less table of column names/types + cell values, with a distribution popover
// per column and a "More" cell-viewer modal. Downgraded as directive 'reportTable'; its usages in the
// (AngularJS) report-default / report-dataframe-full rebind to Angular syntax ([table]/[distributions]/
// [datatypes-visible]). All bindings are read-only -> @Input.
//  - $filter('precision'|'cut') -> bridged $filter; $rootScope.$broadcast + $uibModal -> bridged tokens.
//  - uib-popover distribution hint -> CSS-hover tooltip; the getDistributionType(col).subtype access is
//    guarded (Angular would throw on undefined where AngularJS was null-safe).
//  - the cell-viewer modal (editInWindow) stays AngularJS (opened on-demand via bridged $uibModal).
@Component({
  standalone: false,
  selector: 'report-table',
  template: `
    <div class="report-table-body table-responsive">
      <table class="table table-striped table-hover report-table">
        <thead>
          <tr>
            <th *ngFor="let columnName of table?.columnNames">
              <div>
                <p class="break-mid-words">
                  <ng-container *ngIf="getDistributionType(columnName) as dist">
                    <span class="has-distribution" (click)="showDistribution(columnName)"
                          [title]="'Open ' + dist.subtype + ' distibution'"
                          [ngSwitch]="dist.subtype">
                      <i *ngSwitchCase="'discrete'" class="fa fa-pie-chart"></i>
                      <i *ngSwitchCase="'continuous'" class="fa fa-bar-chart-o"></i>
                    </span>
                  </ng-container>
                  <span>{{ columnName }}</span>
                </p>
              </div>
              <div>
                <span *ngIf="datatypesVisible" class="col-type">({{ getColumnType(columnName) }})</span>
              </div>
            </th>
          </tr>
        </thead>
        <tbody class="table-container">
          <tr *ngFor="let row of table?.values">
            <td *ngFor="let value of row; let i = index">
              <i *ngIf="value === null" class="null-value">(null)</i>
              <span *ngIf="value !== null" class="whitespaces-preserved break-mid-words">{{ shortenValues(value, i) }}
                <a *ngIf="isLongEnoughToBeCutOff(value)" (click)="editInWindow(value)">More</a>
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `
})
export class ReportTableComponent implements OnInit, DoCheck {
  @Input() table: any;
  @Input() distributions: any;
  @Input() datatypesVisible: boolean;

  reportWidth = 0;
  private maxLength = 0;
  private map: { [key: string]: any } = {};
  private columnTypes: any[] = [];
  private value: any;

  constructor(
    @Inject('$rootScope') private $rootScope: any,
    private modal: ModalService
  ) {}

  ngOnInit(): void {
    this.reportWidth = window.innerWidth / 2;
    this.rebuild();
  }

  // Legacy $watch(table.columnNames) rebuilds the name->type map each digest; cheap for a handful of columns.
  ngDoCheck(): void {
    this.rebuild();
  }

  private rebuild(): void {
    if (!this.table || !this.table.columnNames || !this.table.columnTypes) {
      return;
    }
    this.maxLength = this.reportWidth / this.table.columnNames.length;
    this.table.columnNames.forEach((name: string, idx: number) => {
      const columnType = this.table.columnTypes[idx];
      this.map[name] = columnType;
      this.columnTypes[idx] = columnType;
    });
  }

  getColumnType(columnName: string): any {
    if (!this.table || !this.table.columnNames) {
      return undefined;
    }
    const indexOfColumn = this.table.columnNames.indexOf(columnName);
    return this.table.columnTypes[indexOfColumn];
  }

  getDistributionType(columnName: string): any {
    return this.distributions && this.distributions[columnName];
  }

  isLongEnoughToBeCutOff(value: any): boolean {
    if (value) {
      return value.length > this.maxLength;
    }
    return false;
  }

  shortenValues(value: any, index: number): any {
    if (this.columnTypes[index] === 'numeric') {
      return precision(value);
    }
    return cut(value, true, this.maxLength, ' ...');
  }

  showDistribution(columnName: string): void {
    if (this.getDistributionType(columnName)) {
      this.$rootScope.$broadcast(SELECT_COLUMN, {
        colName: columnName,
        colType: this.getColumnType(columnName),
        colTypesMap: this.map,
        distributions: this.distributions
      });
    }
  }

  editInWindow(value: any): void {
    // Read-only cell viewer — the result is ignored (nothing is editable).
    this.modal.open(CellViewerModalComponent, { code: value }, { panelClass: ['ds-modal-panel', 'ds-modal-lg'] });
  }
}
