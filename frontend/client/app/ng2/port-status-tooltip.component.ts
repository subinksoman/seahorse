/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Component, Input, OnChanges } from '@angular/core';
import * as _ from 'lodash';
import '../workflows/editor/port-status-tooltip/port-status-tooltip.less';

// Phase C-2 (UI layer): migrated from workflows/editor/port-status-tooltip. First component WITH an
// input binding. Template rewritten AngularJS->Angular: ng-repeat -> *ngFor (with `let last = last`),
// {{ ::type }} -> {{ type }}, ng-if="::!$last" -> *ngIf="!last". The controller's getTypes() (called
// each digest from the legacy ng-repeat) is recomputed in ngOnChanges instead — behaviour-identical and
// avoids Angular dev-mode ExpressionChangedAfterChecked. Downgraded as directive 'portStatusTooltip';
// its editor.html usage binds [portObject] (Angular syntax read by downgradeComponent from the AngularJS scope).
@Component({
  standalone: false,
  selector: 'port-status-tooltip',
  template: `
    <div class="port-status-tooltip">
      <div class="port-status-tooltip__body">
        <span *ngFor="let type of outputTypes; let last = last">
          <span>{{ type }}</span><span *ngIf="!last">,</span>
        </span>
      </div>
    </div>
  `
})
export class PortStatusTooltipComponent implements OnChanges {
  @Input() portObject: any;
  outputTypes: string[] = [];

  ngOnChanges(): void {
    if (!this.portObject) {
      this.outputTypes = [];
      return;
    }
    this.outputTypes = this.portObject.typeQualifier.map((typeQualifier: string) => _.last(typeQualifier.split('.')));
    if (this.outputTypes.length > 3) {
      this.outputTypes = this.outputTypes.slice(0, 3);
      this.outputTypes.push('...');
    }
  }
}
