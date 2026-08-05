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
export function $timeoutFactory(i: any): any { return i.get('$timeout'); }
export function $qFactory(i: any): any { return i.get('$q'); }
export function $httpFactory(i: any): any { return i.get('$http'); }
// WorkflowService hub deps that stay AngularJS: the deepsense-* graph model (Workflow) + cycle
// analyser. Bridged so WorkflowService can @Inject them. (debounce is lodash _.debounce now, not bridged.)
export function workflowFactory(i: any): any { return i.get('Workflow'); }
export function $documentFactory(i: any): any { return i.get('$document'); }
// deepsense-* node-parameters factory stays AngularJS (deepsense-* migrates late); bridged for GraphNodesService.
export function deepsenseNodeParametersFactory(i: any): any { return i.get('DeepsenseNodeParameters'); }
// Core-canvas finale: bridged for the migrated core-canvas component + its jsplumb-draggable directive
// (AdapterService = jsPlumb adapter, GraphNode = the deepsense graph-node model exposing MOVE event
// constant). The ng2 KeyboardDirective now checks the CDK overlay directly (no $uibModalStack bridge).
// attributes-panel: bridged for the Jupyter notebook URL (trustAsResourceUrl).
// ngFileUpload's Upload service, bridged for the (migrated) upload-workflow modal folded into HomeComponent.
export function uploadFactory(i: any): any { return i.get('Upload'); }
// Cluster-settings modals (migrated to CDK): PresetService (preset CRUD/validation) + PresetModalLabels
// (static field labels) stay AngularJS for now; bridged so the Angular modal components can use them.
export function presetServiceFactory(i: any): any { return i.get('PresetService'); }
export function presetModalLabelsFactory(i: any): any { return i.get('PresetModalLabels'); }

export const upgradedProviders: any[] = [
  { provide: '$rootScope', useFactory: $rootScopeFactory, deps: ['$injector'] },
  { provide: 'config', useFactory: configFactory, deps: ['$injector'] },
  { provide: '$log', useFactory: $logFactory, deps: ['$injector'] },
  { provide: '$timeout', useFactory: $timeoutFactory, deps: ['$injector'] },
  { provide: '$q', useFactory: $qFactory, deps: ['$injector'] },
  { provide: '$http', useFactory: $httpFactory, deps: ['$injector'] },
  { provide: 'Workflow', useFactory: workflowFactory, deps: ['$injector'] },
  { provide: '$document', useFactory: $documentFactory, deps: ['$injector'] },
  { provide: 'DeepsenseNodeParameters', useFactory: deepsenseNodeParametersFactory, deps: ['$injector'] },
  { provide: 'Upload', useFactory: uploadFactory, deps: ['$injector'] },
  { provide: 'PresetService', useFactory: presetServiceFactory, deps: ['$injector'] },
  { provide: 'PresetModalLabels', useFactory: presetModalLabelsFactory, deps: ['$injector'] }
];
