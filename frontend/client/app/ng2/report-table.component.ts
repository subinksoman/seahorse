/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Component, Input, Inject, OnInit, DoCheck } from '@angular/core';
import cellViewerTpl from '../workflows/reports/report-table/cell-viewer/cell-viewer-modal.html';

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
                    <span class="has-distribution rt-dist" (click)="showDistribution(columnName)"
                          [ngSwitch]="dist.subtype">
                      <i *ngSwitchCase="'discrete'" class="fa fa-pie-chart"></i>
                      <i *ngSwitchCase="'continuous'" class="fa fa-bar-chart-o"></i>
                      <span class="rt-dist__tooltip">Open {{ dist.subtype }} distibution</span>
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
  `,
  styles: [`
    .rt-dist { position: relative; }
    .rt-dist__tooltip {
      display: none; position: absolute; bottom: 100%; left: 0; margin-bottom: 6px; white-space: nowrap;
      z-index: 1000; padding: 5px 9px; background: #fff; color: #333; font-size: 12px;
      border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.25);
    }
    .rt-dist:hover .rt-dist__tooltip { display: block; }
  `]
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
    @Inject('$filter') private $filter: any,
    @Inject('$uibModal') private $uibModal: any
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
      return this.$filter('precision')(value);
    }
    return this.$filter('cut')(value, true, this.maxLength, ' ...');
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
    const that = this;
    const modalInstance = this.$uibModal.open({
      animation: true,
      backdrop: 'static',
      templateUrl: cellViewerTpl,
      controller: 'cellViewerModalCtrl',
      controllerAs: 'acstmCtrl',
      size: 'lg',
      resolve: {
        codeSnippet: () => ({ code: value })
      }
    });
    modalInstance.result.then((modifiedCode: any) => {
      if (that.value !== modifiedCode) {
        that.value = modifiedCode;
      }
    }, () => {});
  }
}
