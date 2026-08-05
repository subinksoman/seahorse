/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Component, Input, Inject, ElementRef, OnChanges, OnDestroy, HostListener } from '@angular/core';
import * as _ from 'lodash';
import { BottomBarService } from '../services/bottom-bar.service';
import { ModalService } from '../modals/modal.service';
import { ReportChartModalComponent } from '../modals/report-chart-modal.component';

const SELECT_COLUMN = 'select-column'; // reports.controller EVENTS.SELECT_COLUMN

// Phase C / report subsystem (shell): migrated from workflows/reports (report.directive + reports.controller).
// The report panel container: close button, no-report message, and the report-type ng-switch ->
// report-dataframe-full / report-default (both Angular now). Downgraded as directive 'report';
// workflows-editor.html rebinds [report]. The distribution-chart modal (the nvd3 pie/column charts) is
// now the native-Angular ReportChartModalComponent, opened on-demand via the CDK ModalService (was the
// last $uibModal usage). Injects the Angular BottomBarService.
//  - the '=report' binding -> @Input('report'); the $watch(currentReport) scrollTop reset -> ngOnChanges;
//    the Chrome-bug mouseout workaround (broadcast OutputPoint.MOUSEOUT on mouseover) -> @HostListener.
@Component({
  standalone: false,
  selector: 'report',
  template: `
    <div class="c-report c-report-shadow">
      <div>
        <button class="c-report__close close u-flex u-flex--center-center" (click)="close()">
          <i class="c-report__close-icon fa fa-close"></i>
        </button>
      </div>

      <div *ngIf="!currentReport" class="c-report no-report" style="overflow-y: scroll;">
        <div class="no-report-title">
          <i class="fa fa-file-text-o"></i>
          <span>No report selected!</span>
        </div>
        <div class="no-report-description">
          <span>To see a report, run the workflow and click on a node's output port.</span>
        </div>
      </div>

      <div class="c-report" style="overflow-y: scroll;" *ngIf="currentReport">
        <div class="report-header"><h2> {{ getReport().name }} </h2></div>
        <div [ngSwitch]="getReport().reportType">
          <report-dataframe-full *ngSwitchCase="'DataFrameFull'" [report]="getReport()"></report-dataframe-full>
          <report-default *ngSwitchDefault [report]="getReport()"></report-default>
        </div>
      </div>
    </div>
  `
})
export class ReportComponent implements OnChanges, OnDestroy {
  // eslint-disable-next-line @angular-eslint/no-input-rename — legacy attribute was `report`.
  @Input('report') currentReport: any;

  autoHeight = false;
  private removeSelectColumnListener: () => void;

  constructor(
    private host: ElementRef,
    @Inject('$rootScope') private $rootScope: any,
    private modal: ModalService,
    private bottomBarService: BottomBarService
  ) {
    this.removeSelectColumnListener =
      this.$rootScope.$on(SELECT_COLUMN, (_event: any, data: any) => this.onSelectColumn(data));
  }

  ngOnChanges(): void {
    // Legacy $watch(currentReport): reset scroll to top when the shown report changes.
    if (this.host && this.host.nativeElement) {
      this.host.nativeElement.scrollTop = 0;
    }
  }

  ngOnDestroy(): void {
    if (this.removeSelectColumnListener) {
      this.removeSelectColumnListener();
    }
  }

  // HACK (DS-2724): an overlapping report can swallow a port's mouseout, so re-broadcast it (idempotent).
  @HostListener('mouseover')
  onMouseOver(): void {
    this.$rootScope.$broadcast('OutputPoint.MOUSEOUT');
  }

  getReport(): any {
    return this.currentReport;
  }

  getTables(): any {
    this.checkHeight();
    return this.currentReport && this.currentReport.tables;
  }

  private checkHeight(): void {
    if (!this.currentReport) {
      return;
    }
    let values = 0;
    _.each(this.currentReport.tables, (dataObject: any) => {
      values += dataObject.values.length;
    });
    this.autoHeight = values < 10;
  }

  getDistributionObject(colName: string): any {
    if (this.currentReport && this.currentReport.distributions) {
      return this.currentReport.distributions[colName];
    }
    return undefined;
  }

  getReportName(): any {
    return this.currentReport && this.currentReport.name;
  }

  close(): void {
    this.bottomBarService.deactivatePanel('reportTab');
  }

  private onSelectColumn(data: any): void {
    const distObject = this.getDistributionObject(data.colName);
    const colType = data.colType;
    const colTypesMap = data.colTypesMap;
    const distributions = data.distributions;
    const colTypesWithDistributions: any = {};

    for (const colName in colTypesMap) {
      if (distributions[colName] && distributions[colName].subtype !== 'no_distribution') {
        colTypesWithDistributions[colName] = colTypesMap[colName];
      }
    }

    if (!_.isUndefined(distObject)) {
      this.modal.open(ReportChartModalComponent, {
        distObject,
        colType,
        colTypesMap,
        distributions,
        columnNames: _.keys(colTypesWithDistributions)
      }, { panelClass: ['ds-modal-panel', 'ds-modal-lg'] });
    }
  }
}
