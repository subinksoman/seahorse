/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Component, Input } from '@angular/core';
import '../common/deepsense-components/deepsense-loading-spinner/processing/loading-spinner-processing.less';

// Phase C / bootstrap inversion: native Angular full-screen loading indicator (shown by <app-root>
// while a workflow/route loads). Redesigned as a CENTERED overlay: a spinning ring in the brand teal
// with the projected label (was ng-transclude -> <ng-content>) beneath it. The animated trailing dots
// are pure CSS now (no setTimeout/detectChanges loop needed). Declared + used as
// 'deepsense-loading-spinner-processing'.
@Component({
  standalone: false,
  selector: 'deepsense-loading-spinner-processing',
  template: `
    <div class="deepsense-loading-spinner-processing" [class.bg]="bg === 'true'">
      <div class="dsl-box">
        <div class="dsl-ring"><div></div><div></div><div></div><div></div></div>
        <div class="dsl-label"><ng-content></ng-content><span class="dsl-dots"></span></div>
      </div>
    </div>
  `
})
export class LoadingSpinnerProcessingComponent {
  @Input() bg: string;
}
