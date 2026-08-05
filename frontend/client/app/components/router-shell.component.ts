/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Component, OnInit, OnDestroy, DoCheck, Inject } from '@angular/core';
import { Router, NavigationStart } from '@angular/router';
import { Dialog } from '@angular/cdk/dialog';
import { Subscription } from 'rxjs';

// Phase C / router inversion: the TOP-LEVEL @angular/router outlet host. Downgraded 'routerShell' and
// dropped into index.html where <ui-view> was (index.html itself stays AngularJS-bootstrapped, so the
// loading-mask / feedback / processing-spinner around it are unchanged). Also carries the app.run.js
// $stateChangeStart cleanup — since ui-router is gone, we do it on each Router NavigationStart: reset
// the loading flags, drop deepsense custom $rootScope listeners, and dismiss any open uib-modals.
@Component({
  standalone: false,
  selector: 'router-shell',
  template: `<router-outlet></router-outlet>`
})
export class RouterShellComponent implements OnInit, OnDestroy {
  private sub: Subscription;

  constructor(
    private router: Router,
    @Inject('$rootScope') private $rootScope: any,
    private dialog: Dialog
  ) {}

  ngOnInit(): void {
    this.sub = this.router.events.subscribe((e) => {
      if (e instanceof NavigationStart) {
        this.$rootScope.stateData.dataIsLoaded = undefined;
        this.$rootScope.showView = undefined;
        const listeners = this.$rootScope.$$listeners || {};
        for (const key in listeners) {
          if (key[0] !== '$') { delete listeners[key]; }
        }
        this.dialog.closeAll();
      }
    });
  }

  ngOnDestroy(): void {
    if (this.sub) { this.sub.unsubscribe(); }
  }
}

// The 'workflows' parent layout (was workflows.html): the header (nav rail + editor status bar) around
// a nested <router-outlet> for the editor child route. Status bar shows once the resolver flags
// dataIsLoaded (read off the bridged $rootScope in ngDoCheck).
@Component({
  standalone: false,
  selector: 'workflows-shell',
  template: `
    <section class="u-full-height">
      <header class="c-main-header">
        <navigation-bar class="c-navigation-bar"></navigation-bar>
        <div class="c-main-header__nav-bar">
          <workflow-editor-status-bar *ngIf="dataIsLoaded"></workflow-editor-status-bar>
        </div>
      </header>
      <div class="c-dynamic-part"><router-outlet></router-outlet></div>
    </section>
  `
})
export class WorkflowsShellComponent implements DoCheck {
  dataIsLoaded = false;

  constructor(@Inject('$rootScope') private $rootScope: any) {}

  ngDoCheck(): void {
    this.dataIsLoaded = !!(this.$rootScope.stateData && this.$rootScope.stateData.dataIsLoaded);
  }
}
