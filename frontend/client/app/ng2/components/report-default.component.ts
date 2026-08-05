/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Component, Input } from '@angular/core';

// Phase C / report subsystem: migrated from workflows/reports/report-default (thin directive). Renders one
// report-table per table in a non-dataframe report. Downgraded as directive 'reportDefault'; used in the
// (AngularJS) report shell (reports.html) via ng-switch -> rebinds [report]. Hosts the migrated
// <report-table> directly (pure Angular binding, camelCase [datatypesVisible]).
@Component({
  standalone: false,
  selector: 'report-default',
  template: `
    <div class="report-default">
      <div class="panel panel-default" *ngFor="let table of report?.tables">
        <div class="report-table-header clearfix">
          <div class="col-md-4 col-xs-6"><h2>{{ table.name }}</h2></div>
        </div>
        <report-table [table]="table" [datatypesVisible]="false"></report-table>
      </div>
    </div>
  `
})
export class ReportDefaultComponent {
  @Input() report: any;
}
