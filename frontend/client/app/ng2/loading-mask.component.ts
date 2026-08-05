/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Component, Input, OnDestroy, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { ServerCommunicationService } from './server-communication.service';

// Phase C / bootstrap inversion (step 3): native Angular port of common/loading-mask (directive + ctrl).
// The reconnecting overlay shown when the STOMP websocket drops. Subscribes to the ng2
// ServerCommunicationService.connectionStatus$ (a native RxJS stream) instead of $rootScope.$on — a
// downgraded component's injected $rootScope does NOT receive the AngularJS $broadcast the way the
// original isolate $scope.$on did, so the native stream is both correct and a step toward dropping the
// $rootScope event bus. Declared + downgraded as 'loadingMask' so it renders in the still-AngularJS
// index.html; once index.html becomes an Angular root it is used directly.
@Component({
  standalone: false,
  selector: 'loading-mask',
  template: `
    <div class="disconnected-mask animated fadeIn" [hidden]="!isDisconnected">
      <div class="progress">
        <div class="progress-bar progress-bar-{{ type }} progress-bar-striped active reconnecting-bar">
          <span class="reconnecting-sign">{{ string }}</span>
          <span class="dots">{{ dots }}</span>
        </div>
      </div>
    </div>
  `
})
export class LoadingMaskComponent implements AfterViewInit, OnDestroy {
  @Input() type: string;
  @Input() string: string;

  dots = '...';
  isDisconnected = false;
  private runningDots = false;
  private timer: any;
  private sub: Subscription;

  constructor(private serverCommunication: ServerCommunicationService, private cdr: ChangeDetectorRef) {}

  // Subscribe after the view exists (the BehaviorSubject replays its current value synchronously on
  // subscribe, so subscribing in the constructor would detectChanges() before the view is created).
  ngAfterViewInit(): void {
    this.sub = this.serverCommunication.connectionStatus$.subscribe((connected: boolean) => {
      this.isDisconnected = !connected;
      if (this.isDisconnected) {
        if (!this.runningDots) { this.processDots(); }
      } else {
        this.runningDots = false;
        clearTimeout(this.timer);
      }
      this.cdr.detectChanges();
    });
  }

  private processDots(): void {
    this.runningDots = true;
    this.dots = this.dots.length >= 3 ? '.' : this.dots + '.';
    this.timer = setTimeout(() => { this.processDots(); this.cdr.detectChanges(); }, 450);
  }

  ngOnDestroy(): void {
    if (this.sub) { this.sub.unsubscribe(); }
    clearTimeout(this.timer);
  }
}
