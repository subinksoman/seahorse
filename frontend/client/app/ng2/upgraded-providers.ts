/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

// Phase C-1: bridge AngularJS core services/constants into the Angular injector so migrated
// Angular services can inject them by string token (e.g. @Inject('$rootScope')). Each factory
// pulls the value out of the live AngularJS $injector, which UpgradeModule exposes to Angular
// under the '$injector' token. Instantiation is lazy — these run only when a downgraded service
// is first constructed (long after upgrade bootstrap), so the AngularJS injector is ready.
export function $rootScopeFactory(i: any): any { return i.get('$rootScope'); }
export function configFactory(i: any): any { return i.get('config'); }
export function $logFactory(i: any): any { return i.get('$log'); }
export function toastrFactory(i: any): any { return i.get('toastr'); } // angular-toastr service
export function $timeoutFactory(i: any): any { return i.get('$timeout'); }
export function $uibModalFactory(i: any): any { return i.get('$uibModal'); } // angular-ui-bootstrap
export function $cookiesFactory(i: any): any { return i.get('$cookies'); } // ngCookies

export const upgradedProviders: any[] = [
  { provide: '$rootScope', useFactory: $rootScopeFactory, deps: ['$injector'] },
  { provide: 'config', useFactory: configFactory, deps: ['$injector'] },
  { provide: '$log', useFactory: $logFactory, deps: ['$injector'] },
  { provide: 'toastr', useFactory: toastrFactory, deps: ['$injector'] },
  { provide: '$timeout', useFactory: $timeoutFactory, deps: ['$injector'] },
  { provide: '$uibModal', useFactory: $uibModalFactory, deps: ['$injector'] },
  { provide: '$cookies', useFactory: $cookiesFactory, deps: ['$injector'] }
];
