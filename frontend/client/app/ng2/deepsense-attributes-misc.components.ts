/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Component, Input } from '@angular/core';

// Phase C / deepsense-attributes: Angular versions of the two small directives embedded in the (now Angular)
// attributes-panel. Declared, NOT downgraded — the AngularJS originals stay registered for the other
// AngularJS templates that use them (home, status-bar, modals, library-modal); same selectors don't collide.

// time-diff: shows (end - start) in seconds.
@Component({
  standalone: false,
  selector: 'time-diff',
  template: `<time [attr.datetime]="end" class="text-right text-lowercase">{{ getDiff() }} seconds</time>`
})
export class TimeDiffComponent {
  @Input() start: any;
  @Input() end: any;
  getDiff(): number {
    return (new Date(this.end).getTime() - new Date(this.start).getTime()) / 1000;
  }
}

// deepsense-loading-spinner-sm: a small spinner.
@Component({
  standalone: false,
  selector: 'deepsense-loading-spinner-sm',
  template: `<div class="deepsense-loading-spinner-sm"><i class="fa fa-spinner fa-spin fa-4x"></i></div>`
})
export class DeepsenseLoadingSpinnerSmComponent {}
