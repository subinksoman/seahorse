/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Component, Input, OnInit, Inject } from '@angular/core';

// Phase C / router track (step 1): migrated from errors/errors.controller.js + the 3 error state
// templates (error-missing / error-version / error-request-timeout). One component switches on a
// `mode` input. Downgraded 'errorView'; each ui-router state template now just hosts <error-view
// mode="...">. Router coupling ($stateParams for type/id/errorMessage, "Return home") is bridged
// through the AngularJS $injector for now; it becomes ActivatedRoute + routerLink when ui-router is
// swapped for @angular/router (the culmination of this track).
@Component({
  standalone: false,
  selector: 'error-view',
  template: `
    <div [ngSwitch]="mode">

      <div *ngSwitchCase="'missing'" class="c-error text-center animated fadeIn">
        <h2>Workflow not found</h2>
        <p class="c-error__description"><span>{{ errorMessage }}</span></p>
        <a (click)="goHome()" class="btn btn-info btn-lg c-error__link">Return to home</a>
      </div>

      <div *ngSwitchCase="'version'" class="c-error text-center animated fadeIn">
        <h2>This {{ getType() }} is no longer compatible</h2>
        <p class="c-error__description">
          <span>Current API version is: {{ getAPIVersion() }}</span>
          <span>{{ getErrorDescription() }}</span>
        </p>
        <a [attr.href]="getLink()" class="btn btn-info btn-lg c-error__link">Download JSON</a>
        <a (click)="goHome()" class="btn btn-info btn-lg c-error__link">Return to home</a>
      </div>

      <section *ngSwitchCase="'timeout'" class="c-error c-error--timeout text-center m-t-xl">
        <pre>The server timed out waiting for the request</pre>
        <a (click)="goHome()" class="btn btn-info btn-lg c-error__link">Return to home</a>
      </section>

    </div>
  `
})
export class ErrorViewComponent implements OnInit {
  @Input() mode: string;
  errorMessage: string;

  constructor(
    @Inject('config') private config: any,
    @Inject('$rootScope') private $rootScope: any,
    @Inject('$stateParams') private $stateParams: any,
    @Inject('$state') private $state: any
  ) {}

  ngOnInit(): void {
    this.$rootScope.stateData.dataIsLoaded = true;
    this.$rootScope.showView = true;
    this.errorMessage = this.$stateParams.errorMessage ||
      (this.$rootScope.stateData && this.$rootScope.stateData.errorMessage);
  }

  getType(): string { return this.$stateParams.type; }
  getErrorDescription(): string { return this.$stateParams.errorMessage; }
  getAPIVersion(): string { return this.config.apiVersion; }
  getLink(): string {
    return this.config.apiHost + '/' + this.config.urlApiVersion + '/' +
      this.$stateParams.type + 's/' + this.$stateParams.id + '/download';
  }

  goHome(): void { this.$state.go('home'); }
}
