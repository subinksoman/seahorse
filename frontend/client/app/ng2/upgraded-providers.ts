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
// config is now read from window.__seahorseConfig (set by config.js), NOT the AngularJS $injector.
export function configFactory(): any { return (window as any).__seahorseConfig; }

// $rootScope is the last bridge remaining: it is the inter-framework event bus and can only be dropped
// atomically with the bootstrap flip (step 6). Everything else (preset CRUD/labels, canvas, graph model,
// datasources, $http/$q/$timeout/…) has been ported to native ng2 services.
export const upgradedProviders: any[] = [
  { provide: '$rootScope', useFactory: $rootScopeFactory, deps: ['$injector'] },
  { provide: 'config', useFactory: configFactory }
];
