import 'reflect-metadata';
import 'zone.js';
import '@angular/compiler'; // JIT compiler (no AoT/ngtsc in this custom webpack build) — must load first
import { NgModule, DoBootstrap } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { UpgradeModule, downgradeInjectable } from '@angular/upgrade/static';
import { HelloAngularService } from './hello.service';
import { UserService } from './user.service';
import { UUIDGenerator } from './uuid-generator.service';
import { TimeService } from './time.service';
import { HelpersService } from './helpers.service';

declare const angular: any;

// Expose Angular services to AngularJS DI (the two frameworks share one injector tree). Each
// downgraded service replaces its legacy AngularJS registration; consumers are unchanged.
angular.module('ds.lab')
  .factory('helloAngular', downgradeInjectable(HelloAngularService) as any)
  .factory('UserService', downgradeInjectable(UserService) as any) // Phase C-1: migrated to Angular 18
  .factory('UUIDGenerator', downgradeInjectable(UUIDGenerator) as any) // Phase C-1: migrated to Angular 18
  .factory('TimeService', downgradeInjectable(TimeService) as any) // Phase C-1: migrated to Angular 18
  .factory('HelpersService', downgradeInjectable(HelpersService) as any); // Phase C-1: migrated to Angular 18

@NgModule({
  imports: [BrowserModule, UpgradeModule]
})
export class AppModule implements DoBootstrap {
  constructor(private upgrade: UpgradeModule) {}
  ngDoBootstrap(): void {
    // Bootstrap the existing AngularJS app under Angular's control (strict DI preserved).
    this.upgrade.bootstrap(document.documentElement, ['ds.lab'], { strictDi: true });
    // eslint-disable-next-line no-console
    console.log('[hybrid] Angular', '18', 'bootstrapped ds.lab; helloAngular =', (angular.element(document.documentElement).injector() ? 'wired' : '?'));
  }
}

platformBrowserDynamic().bootstrapModule(AppModule).catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[hybrid] bootstrap failed', err);
});
