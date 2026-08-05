/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import {
  Component, Input, Inject, ElementRef, AfterViewInit, OnChanges, OnDestroy
} from '@angular/core';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import * as _ from 'lodash';
import moment from 'moment';
import '../../workflows/reports/charts/charts.less';

// Phase C / AngularJS removal: the report distribution-chart modal — the LAST $uibModal usage. Was
// workflows/reports/report-chart-panel.html opened via the bridged $uibModal with an inline controller,
// rendering the AngularJS distribution-{categorical,continuous}-chart + pie/column-plot directives.
// Those directives, wrapped by UpgradeComponent, render EMPTY inside a CDK dialog, so the whole chart
// subsystem is ported to native Angular here (nvd3 pie/column). Note the legacy continuous template had
// NO UI to switch plot type (chosenPlot was hard-set to 'column'), and Highcharts was never loaded, so
// the box-plot / basic-line-plot branches were dead — only pie (discrete) + column (continuous) render.

declare const d3: any;
declare const nv: any;

// precision filter (was common/filters/precision.js) — trims a number to 6 significant digits and
// strips trailing zeros; passes through non-numeric / scientific-notation values unchanged.
function removeTrailingZeros(str: string): string {
  if (!_.includes(str, '.') || _.includes(str, 'e') || _.includes(str, 'E')) { return str; }
  str = str.replace(/0+$/, '');
  if (str.charAt(str.length - 1) === '.') { str = str.slice(0, -1); }
  return str;
}
export function precision(value: any, digits = 6): any {
  if (_.includes(value, 'e') || _.includes(value, 'E')) { return value; }
  const numVal = parseFloat(value);
  if (_.isNaN(numVal)) { return value; }
  return removeTrailingZeros(numVal.toPrecision(digits));
}

// nvd3 pie chart for a discrete distribution (was charts/pie-plot.js). Same selector 'pie-plot' as the
// AngularJS directive — they coexist because this only compiles inside the Angular-rendered modal.
@Component({
  standalone: false,
  selector: 'pie-plot',
  template: `<div class="plot"><svg class="svg-plot"></svg></div>`
})
export class PiePlotComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() data: any;
  private chart: any;
  private ready = false;

  constructor(private host: ElementRef) {}

  ngAfterViewInit(): void { this.ready = true; this.render(); }
  ngOnChanges(): void { if (this.ready) { this.render(); } }
  ngOnDestroy(): void { if (this.chart && this.chart.tooltip) { this.chart.tooltip.hidden(true); } }

  private render(): void {
    const data = this.data;
    if (!data || typeof nv === 'undefined') { return; }
    const chartValues = _.map(data.counts, (val: any, idx: number) => ({
      x: data.buckets[idx], y: precision(val)
    }));
    const chart = nv.models.pieChart()
      .duration(500).noData('There is no Data to display').labelThreshold(0).labelType('percent');
    chart.tooltip.hideDelay(0);
    chart.tooltip.valueFormatter((n: any) => n);
    setTimeout(() => {
      d3.select(this.host.nativeElement.querySelector('.svg-plot')).datum(chartValues).call(chart);
      nv.utils.windowResize(chart.update);
    });
    this.chart = chart;
  }
}

// nvd3 multi-bar chart for a continuous distribution (was charts/column-plot.js).
@Component({
  standalone: false,
  selector: 'column-plot',
  template: `<div class="plot"><svg class="svg-plot"></svg></div>`
})
export class ColumnPlotComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() data: any;
  @Input() columnType: string;
  private chart: any;
  private ready = false;

  private static readonly MAX_HEIGHT = 400;
  private static readonly LABEL_LEN_THRESHOLD = 20;
  private static readonly MAX_LABEL_CHARS = 40;

  constructor(private host: ElementRef) {}

  ngAfterViewInit(): void { this.ready = true; this.render(); }
  ngOnChanges(): void { if (this.ready) { this.render(); } }
  ngOnDestroy(): void { if (this.chart && this.chart.tooltip) { this.chart.tooltip.hidden(true); } }

  private render(): void {
    const data = this.data;
    if (!data || typeof nv === 'undefined') { return; }
    const labels = this.getLabels(data.buckets);
    const chartValues = _.map(data.counts, (val: any, idx: number) => ({ x: labels.texts[idx], y: val }));
    const chartData = [{ values: chartValues, key: 'Value occurences', color: '#ff7f0e' }];
    const chart = nv.models.multiBarChart()
      .margin({ left: 70, right: 70, bottom: 20, top: 20 })
      .height(this.getChartHeight(labels.longest))
      .duration(500).noData('There is no Data to display')
      .groupSpacing(0.03).reduceXTicks(false).showControls(false)
      .color(['#ff7f0e']).rotateLabels(labels.angle);
    chart.tooltip.hideDelay(0);
    setTimeout(() => {
      d3.select(this.host.nativeElement.querySelector('.svg-plot')).datum(chartData).call(chart);
      nv.utils.windowResize(chart.update);
    });
    this.chart = chart;
  }

  // sliding window of 2 over the bucket edges -> "start - end" labels (was HelpersService.sliding).
  private getLabels(buckets: any[]): { texts: string[], longest: number, angle: number } {
    let longest = 0;
    const texts = (buckets || []).slice(0, -1).map((_v: any, i: number) => {
      let start = buckets[i], end = buckets[i + 1];
      if (this.columnType === 'timestamp') {
        start = moment(new Date(start)).format('YYYY-MM-DD HH:mm:ss');
        end = moment(new Date(end)).format('YYYY-MM-DD HH:mm:ss');
      } else {
        start = precision(start); end = precision(end);
      }
      const str = `${start} - ${end}`;
      if (str.length > longest) { longest = str.length; }
      return str;
    });
    if (longest > ColumnPlotComponent.MAX_LABEL_CHARS) { longest = ColumnPlotComponent.MAX_LABEL_CHARS; }
    const angle = longest > ColumnPlotComponent.LABEL_LEN_THRESHOLD ? -70 : -45;
    return { texts, longest, angle };
  }

  private getChartHeight(longestLabel: number): number {
    const letterSize = longestLabel > ColumnPlotComponent.LABEL_LEN_THRESHOLD ? 5 : 4;
    return ColumnPlotComponent.MAX_HEIGHT - longestLabel * letterSize;
  }
}

// The modal itself (was report-chart-panel.html + the inline $uibModal controller). Opened via
// ModalService; DIALOG_DATA carries the picked distribution + the maps needed to switch columns.
@Component({
  standalone: false,
  template: `
    <div class="modal-content">
      <div class="inmodal report-chart-panel">
        <div class="modal-header">
          <i class="fa fa-area-chart modal-icon"></i>
          <h4 class="modal-title">{{ distObject?.name }}</h4>
          <small class="font-bold">{{ distObject?.description }}</small>
          <button type="button" class="close pull-right" aria-label="Close" (click)="close()">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div class="modal-body">
          <div class="row">
            <select class="form-control" [value]="selectedColumn"
                    (change)="onColumnChange($any($event.target).value)">
              <option *ngFor="let c of columnNames" [value]="c">{{ c }}</option>
            </select>
            <dl class="dl-horizontal">
              <dt>Missing values</dt>
              <dd>{{ distObject?.missingValues }}</dd>
              <div *ngIf="distObject?.statistics">
                <dt>Min</dt><dd>{{ shortenValues(distObject.statistics.min) }}</dd>
                <dt>Mean</dt><dd>{{ shortenValues(distObject.statistics.mean) }}</dd>
                <dt>Max</dt><dd>{{ shortenValues(distObject.statistics.max) }}</dd>
              </div>
            </dl>
          </div>
          <div [ngSwitch]="distObject?.subtype" class="row">
            <div *ngSwitchCase="'discrete'" class="distribution-chart">
              <pie-plot [data]="distObject"></pie-plot>
            </div>
            <div *ngSwitchCase="'continuous'" class="distribution-chart">
              <column-plot [data]="distObject" [columnType]="colType"></column-plot>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-white" (click)="close()">Close</button>
        </div>
      </div>
    </div>
  `
})
export class ReportChartModalComponent {
  distObject: any;
  colType: string;
  columnNames: string[];
  selectedColumn: string;
  private colTypesMap: any;
  private distributions: any;

  constructor(@Inject(DIALOG_DATA) data: any, private dialogRef: DialogRef<any>) {
    this.distObject = data.distObject;
    this.colType = data.colType;
    this.columnNames = data.columnNames;
    this.colTypesMap = data.colTypesMap;
    this.distributions = data.distributions;
    this.selectedColumn = data.distObject.name;
  }

  // was $scope.$watch('graphModal.selectedColumn'): swap the shown distribution + column type.
  onColumnChange(name: string): void {
    this.selectedColumn = name;
    this.distObject = this.distributions[name];
    this.colType = this.colTypesMap[name];
  }

  shortenValues(value: any): any {
    if (this.colType === 'numeric') { return precision(value); }
    if (this.colType === 'timestamp') { return moment(new Date(value)).format('YYYY-MM-DD HH:mm:ss'); }
    return value;
  }

  close(): void { this.dialogRef.close(); }
}
