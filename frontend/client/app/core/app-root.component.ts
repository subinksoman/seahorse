/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Component, DoCheck, Inject } from '@angular/core';

// Phase C / bootstrap inversion (THE FLIP): the Angular ROOT component. Replaces the AngularJS-owned
// index.html <body> shell — the same three siblings it used to hold: the reconnect <loading-mask>, the
// <router-shell> frame (which hosts the @angular/router outlet, now with the native [droppable] frame
// directive), and the full-page processing spinner gated on stateData.dataIsLoaded. The former
// `<title ng-bind="pageTitle">` is replaced by syncing document.title from the (native) $rootScope
// emulator's pageTitle in ngDoCheck. Angular bootstraps this component (see bootstrap.ts) instead of
// upgrade-bootstrapping ds.lab; index.html now just carries <app-root>.
@Component({
  standalone: false,
  selector: 'app-root',
  template: `
    <loading-mask type="warning" string="Reconnecting"></loading-mask>
    <router-shell id="wrapper" class="animated fadeIn" droppable droppable-type="frame"></router-shell>
    <deepsense-loading-spinner-processing *ngIf="!dataIsLoaded">Loading</deepsense-loading-spinner-processing>
  `
})
export class AppRootComponent implements DoCheck {
  dataIsLoaded = false;
  private lastTitle = '';

  constructor(@Inject('$rootScope') private $rootScope: any) {}

  ngDoCheck(): void {
    this.dataIsLoaded = !!(this.$rootScope.stateData && this.$rootScope.stateData.dataIsLoaded);
    const title = this.$rootScope.pageTitle || '';
    if (title !== this.lastTitle) {
      this.lastTitle = title;
      document.title = title;
    }
  }
}
