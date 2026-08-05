/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Component, Input, DoCheck } from '@angular/core';
import * as _ from 'lodash';
import '../../workflows/editor/port-status-tooltip/port-status-tooltip.less';

// Phase C-2 (UI layer): migrated from workflows/editor/port-status-tooltip. First component WITH an
// input binding. Template rewritten AngularJS->Angular: ng-repeat -> *ngFor (with `let last = last`),
// {{ ::type }} -> {{ type }}, ng-if="::!$last" -> *ngIf="!last". The controller's getTypes() (called
// each digest from the legacy ng-repeat) is recomputed in ngOnChanges instead — behaviour-identical and
// avoids Angular dev-mode ExpressionChangedAfterChecked. Downgraded as directive 'portStatusTooltip';
// its editor.html usage binds [port-object] (kebab-case): the browser lowercases attribute names, so a
// camelCase [portObject] becomes [portobject] which downgradeComponent cannot map to the portObject
// @Input — the input stays undefined and the tooltip renders empty. ngUpgrade normalizes the dash-case
// [port-object] form back to the camelCase input, so that is the required spelling for multi-word inputs.
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
export class PortStatusTooltipComponent implements DoCheck {
  @Input() portObject: any;
  outputTypes: string[] = [];

  // Recompute each change-detection (like the legacy getTypes() called each digest from ng-repeat), so
  // a portObject bound slightly after creation (downgradeComponent + ng-if hover) still populates the
  // tooltip. Guard portObject/typeQualifier — both are transiently undefined before/without a hovered port.
  ngDoCheck(): void {
    const tq = this.portObject && this.portObject.typeQualifier;
    if (!tq || !tq.length) {
      if (this.outputTypes.length) { this.outputTypes = []; }
      return;
    }
    let types = tq.map((typeQualifier: string) => _.last(typeQualifier.split('.')));
    if (types.length > 3) {
      types = types.slice(0, 3);
      types.push('...');
    }
    // Only replace the array when the content actually changed (avoids needless *ngFor churn /
    // Angular dev-mode ExpressionChanged noise).
    if (types.join('|') !== this.outputTypes.join('|')) {
      this.outputTypes = types;
    }
  }
}
