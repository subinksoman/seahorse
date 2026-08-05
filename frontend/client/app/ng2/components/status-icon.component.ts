/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Component, Input, DoCheck } from '@angular/core';
import { specialOperations } from '../../enums/special-operations.js';
import '../../workflows/editor/core-canvas/graph-node/status-icon/status-icon.less';

// Phase C / canvas: migrated from workflows/editor/core-canvas/graph-node/status-icon. The node
// execution / knowledge-error status badge. Downgraded as directive 'statusIcon'; its usages in
// graph-node.html / datasource-node.html rebind node="..." -> [node]="...".
//
// TWO deliberate hardenings vs a naive port (both caused the earlier canvas regression):
//  1. Every node-property read (knowledgeErrors, state, getFancyKnowledgeErrors) is GUARDED. The
//     legacy AngularJS template called getCssClasses() each digest and AngularJS swallowed the
//     throw when node.knowledgeErrors was transiently undefined; Angular propagates it and a throw
//     inside change-detection breaks the shared ngUpgrade $digest -> the whole editor stops
//     rendering. So all derivation happens here in ngDoCheck behind guards, and the template binds
//     only precomputed fields (statusClass/iconClass/tooltipMessage) — no method calls, no throws.
//  2. The legacy `uib-popover-html` (ui-bootstrap) is REPLACED by a self-contained CSS-hover tooltip
//     that renders the HTML error list via [innerHTML] (Angular sanitizes the <strong>/<br/>),
//     removing a ui-bootstrap popover dependency.
const CSS_CLASSES_MAP: { [key: string]: { status: string; icon: string } } = {
  status_completed: { status: 'completed', icon: 'fa-check' },
  status_running: { status: 'running', icon: 'fa-cog fa-spin' },
  status_queued: { status: 'queued', icon: 'fa-clock-o' },
  status_aborted: { status: 'aborted', icon: 'fa-exclamation' },
  status_failed: { status: 'failed', icon: 'fa-ban' },
  error: { status: 'failed', icon: 'fa-exclamation' },
  unknown: { status: 'unknown', icon: 'fa-question' }
};

@Component({
  standalone: false,
  selector: 'status-icon',
  template: `
    <div class="status-icon" [ngClass]="statusClass" *ngIf="statusClass">
      <div class="status-icon__icon fa" [ngClass]="iconClass"></div>
      <div class="status-icon__tooltip" *ngIf="tooltipMessage" [innerHTML]="tooltipMessage"></div>
    </div>
  `
})
export class StatusIconComponent implements DoCheck {
  @Input() node: any;

  statusClass = '';
  iconClass = '';
  tooltipMessage = '';

  // Recompute each change-detection pass (the legacy template re-evaluated getCssClasses() and the
  // $scope.$watch on node.knowledgeErrors every digest). Fully guarded so it can never throw inside CD.
  ngDoCheck(): void {
    const css = this.getCssClasses();
    const nextStatus = css ? css.status : '';
    const nextIcon = css ? css.icon : '';
    if (nextStatus !== this.statusClass) { this.statusClass = nextStatus; }
    if (nextIcon !== this.iconClass) { this.iconClass = nextIcon; }

    // Legacy behaviour: nodeType was never actually bound on the old controller, so its
    // `=== 'unknown'` branch was dead — the tooltip was always the fancy knowledge-error list.
    let nextTooltip = '';
    if (this.node && Array.isArray(this.node.knowledgeErrors) &&
        typeof this.node.getFancyKnowledgeErrors === 'function') {
      nextTooltip = this.node.getFancyKnowledgeErrors() || '';
    }
    if (nextTooltip !== this.tooltipMessage) { this.tooltipMessage = nextTooltip; }
  }

  private getCssClasses(): { status: string; icon: string } | null {
    if (!this.node) {
      return null;
    }
    if (this.node.operationId === specialOperations.UNKNOWN_OPERATION) {
      return CSS_CLASSES_MAP.unknown;
    }
    if (this.node.state && this.node.state.status && this.node.state.status !== 'status_draft') {
      return CSS_CLASSES_MAP[this.node.state.status] || null;
    } else if (Array.isArray(this.node.knowledgeErrors) && this.node.knowledgeErrors.length > 0) {
      return CSS_CLASSES_MAP.error;
    }
    return null;
  }
}
