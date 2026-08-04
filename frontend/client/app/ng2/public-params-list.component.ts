/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Component, Input, DoCheck } from '@angular/core';
import * as _ from 'lodash';

// Phase C / editor-shell island: migrated from workflows/inner-workflows/public-param/public-params
// -list.js. Lists a workflow's public params (inner-workflow feature). Native Angular (declared, used
// only inside the Angular <workflows-editor> shell). The scope was two-way {workflow, publicParams};
// the $watch that dropped params for deleted nodes now splices publicParams IN PLACE in ngDoCheck so
// the parent array reference reflects the change (no two-way @Output needed). uib-popover -> title.
@Component({
  standalone: false,
  selector: 'public-params-list',
  template: `
    <div>
      <h4> PUBLIC PARAMS </h4>
      <div class="attributes-list">
        <div class="parameter-item" *ngFor="let publicParam of publicParams">
          <div [ngClass]="{'has-error': isDuplicate(publicParam)}" style="text-transform: uppercase;">
            <b>{{ getNodeName(publicParam) }} </b> &gt; <b>{{ publicParam.paramName }}</b>
            <i *ngIf="isDuplicate(publicParam)"
               class="fa status-icon fa-exclamation-circle error-icon"
               title="Public names must be unique."
               style="color: red;"></i>
            <input type="string" class="form-control"
                   [value]="publicParam.publicName"
                   (input)="publicParam.publicName = $event.target.value">
          </div>
        </div>
      </div>
    </div>
  `
})
export class PublicParamsListComponent implements DoCheck {
  @Input() workflow: any;
  @Input() publicParams: any[];

  ngDoCheck(): void {
    // When a node is deleted, drop the public params that referenced it (mutate in place).
    if (this.workflow && this.publicParams) {
      const nodes = this.workflow.getNodes();
      for (let i = this.publicParams.length - 1; i >= 0; i--) {
        if (_.isUndefined(nodes[this.publicParams[i].nodeId])) {
          this.publicParams.splice(i, 1);
        }
      }
    }
  }

  isDuplicate(publicParam: any): boolean {
    const withRequestedName = _.filter(this.publicParams, (p: any) => p.publicName === publicParam.publicName);
    return withRequestedName.length > 1;
  }

  getNodeName(publicParam: any): string {
    const node = this.workflow.getNodeById(publicParam.nodeId);
    return node.uiName || node.name;
  }
}
