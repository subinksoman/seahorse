/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Component, Input, Output, EventEmitter, DoCheck } from '@angular/core';
import * as _ from 'lodash';

// Phase C / editor side panels: migrated from workflows/inner-workflows/public-param/public-params-list
// (AngularJS isolate-scope directive). Lists an inner workflow's public parameters. Downgraded as directive
// 'publicParamsList'; embedded in the (still AngularJS) general-data-panel, so its usage rebinds to Angular
// syntax there. Migrating it unblocks general-data-panel.
//  - isolate `workflow`/`publicParams` (two-way) -> @Input workflow + @Input publicParams / @Output
//    publicParamsChange. The $watch(workflow.getNodes) that drops params for deleted nodes -> guarded
//    ngDoCheck that filters and emits the change when it shrinks (converges: no re-emit once filtered).
//  - the uib-popover duplicate-name warning -> a self-contained CSS-hover tooltip (removes a ui-bootstrap dep).
//  - ng-model -> [value]/(input) mutating the param object (no @angular/forms).
@Component({
  standalone: false,
  selector: 'public-params-list',
  template: `
    <div>
      <h4> PUBLIC PARAMS </h4>
      <div class="attributes-list">
        <div class="parameter-item" *ngFor="let publicParam of publicParams">
          <div [ngClass]="{ 'has-error': isDuplicate(publicParam) }" style="text-transform: uppercase;">
            <b>{{ getNodeName(publicParam) }} </b> &gt; <b>{{ publicParam.paramName }}</b>
            <span *ngIf="isDuplicate(publicParam)" class="pp-dup">
              <i class="fa status-icon fa-exclamation-circle error-icon" style="color: red;"></i>
              <span class="pp-dup__tooltip">Public names must be unique.</span>
            </span>
            <input type="string" class="form-control"
                   [value]="publicParam.publicName"
                   (input)="publicParam.publicName = $any($event.target).value">
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .pp-dup { position: relative; display: inline-block; }
    .pp-dup__tooltip {
      display: none; position: absolute; right: 100%; top: 50%; transform: translateY(-50%);
      margin-right: 8px; white-space: nowrap; z-index: 1000; padding: 6px 10px;
      background: #fff; color: #333; font-size: 12px; border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.25);
    }
    .pp-dup:hover .pp-dup__tooltip { display: block; }
  `]
})
export class PublicParamsListComponent implements DoCheck {
  @Input() workflow: any;
  @Input() publicParams: any;
  @Output() publicParamsChange = new EventEmitter<any>();

  // Legacy $watch(workflow.getNodes): when a node is deleted, drop its public params.
  ngDoCheck(): void {
    if (!this.workflow || !this.workflow.getNodes || !Array.isArray(this.publicParams)) {
      return;
    }
    const nodes = this.workflow.getNodes();
    const filtered = _.reject(this.publicParams, (pp: any) => _.isUndefined(nodes[pp.nodeId]));
    if (filtered.length !== this.publicParams.length) {
      this.publicParams = filtered;
      this.publicParamsChange.emit(filtered);
    }
  }

  isDuplicate(publicParam: any): boolean {
    const withRequestedName = _.filter(this.publicParams, (p: any) => p.publicName === publicParam.publicName);
    return withRequestedName.length > 1;
  }

  getNodeName(publicParam: any): string {
    const node = this.workflow.getNodeById(publicParam.nodeId);
    return node ? (node.uiName || node.name) : '';
  }
}
