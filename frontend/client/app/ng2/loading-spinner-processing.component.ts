/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Component, Input, AfterViewInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import '../common/deepsense-components/deepsense-loading-spinner/processing/loading-spinner-processing.less';

// Phase C / bootstrap inversion (step 3): native Angular port of deepsense-loading-spinner/processing
// (the full-page "Loading..." spinner in index.html, shown while a workflow loads). Content projection
// (was ng-transclude) -> <ng-content>; the animated trailing dots ($timeout loop) -> a zone-patched
// setTimeout loop with detectChanges (this is a downgraded component, so AngularJS's digest doesn't drive
// its CD). Declared + downgraded as 'deepsenseLoadingSpinnerProcessing'.
@Component({
  standalone: false,
  selector: 'deepsense-loading-spinner-processing',
  template: `
    <div class="deepsense-loading-spinner-processing" [class.bg]="bg === 'true'">
      <span><ng-content></ng-content></span>
      <span class="dots">{{ dots }}</span>
      <span class="fa fa-cog fa-spin fa-3x fa-fw"></span>
      <span class="fa fa-cog fa-spin-reverse fa-3x fa-fw"></span>
      <span class="fa fa-cog fa-spin fa-3x fa-fw"></span>
    </div>
  `
})
export class LoadingSpinnerProcessingComponent implements AfterViewInit, OnDestroy {
  @Input() bg: string;
  dots = '...';
  private timer: any;

  constructor(private cdr: ChangeDetectorRef) {}

  // Start the loop after a tick so the first dots change doesn't fire detectChanges inside the initial CD.
  ngAfterViewInit(): void {
    this.timer = setTimeout(() => this.processDots(), 450);
  }

  private processDots(): void {
    this.dots = this.dots.length >= 3 ? '.' : this.dots + '.';
    this.cdr.detectChanges();
    this.timer = setTimeout(() => this.processDots(), 450);
  }

  ngOnDestroy(): void {
    clearTimeout(this.timer);
  }
}
