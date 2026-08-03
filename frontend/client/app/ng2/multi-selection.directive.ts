/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Directive, Input } from '@angular/core';

// Phase C / canvas: Angular version of workflows/graph-panel/multi-selection/multi-selection.js (rubber-band
// + ctrl-click node selection). STAGED: this first deploy ships a STUB (attribute recognised, no behaviour)
// so the structural core-canvas migration — jsPlumb init, *ngFor nodes, jsplumb-draggable, content-projected
// new-node — can be validated in isolation before the ~200-line selection logic is ported in the next deploy.
// The AngularJS directive stays registered but is unused now that canvas.html moved into the Angular template.
@Directive({ standalone: false, selector: '[multi-selection]' })
export class MultiSelectionDirective {
  @Input() workflow: any;
}
