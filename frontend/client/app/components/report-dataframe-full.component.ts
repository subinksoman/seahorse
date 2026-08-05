/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Component, Input } from '@angular/core';
import * as _ from 'lodash';

// Phase C / report subsystem: migrated from workflows/reports/report-dataframe-full (thin directive). The
// DataFrame report: column/row counts + the data-sample report-table (with distributions). Downgraded as
// directive 'reportDataframeFull'; used in the (AngularJS) report shell via ng-switch -> rebinds [report].
// Hosts the migrated <report-table> directly. The $scope helper closures become guarded methods.
@Component({
  standalone: false,
  selector: 'report-dataframe-full',
  template: `
    <div class="report-dataframe">
      <div class="panel panel-default">
        <div class="report-table-header clearfix">
          <div class="col-md-4 col-xs-6"><h2> Data sample </h2></div>
          <div class="report-stats col-md-offset-4">
            <div class="col-xs-6">
              <small>Columns</small>
              <h4><span> {{ getColumnCount() }} </span></h4>
            </div>
            <div class="col-xs-6">
              <small>Rows</small>
              <h4>{{ getPreviewRowCount() }} <span>/ {{ getRowCount() }} </span></h4>
            </div>
          </div>
        </div>

        <report-table [table]="getDataSample()"
                      [distributions]="report?.distributions"
                      [datatypesVisible]="true"></report-table>
      </div>
    </div>
  `
})
export class ReportDataframeFullComponent {
  @Input() report: any;

  private getTableByName(tableName: string): any {
    return this.report && _.find(this.report.tables, (t: any) => t.name === tableName);
  }

  getDataSample(): any {
    return this.getTableByName('Data Sample');
  }

  getTableSizes(): any {
    return this.getTableByName('DataFrame Size');
  }

  getColumnCount(): any {
    const t = this.getTableSizes();
    return t && t.values[0][0];
  }

  getRowCount(): any {
    const t = this.getTableSizes();
    return t && t.values[0][1];
  }

  getPreviewRowCount(): any {
    const s = this.getDataSample();
    return s && s.values.length;
  }
}
