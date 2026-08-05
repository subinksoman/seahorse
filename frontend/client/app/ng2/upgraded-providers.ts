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
export function $intervalFactory(i: any): any { return i.get('$interval'); }
export function $qFactory(i: any): any { return i.get('$q'); }
export function $httpFactory(i: any): any { return i.get('$http'); }
// ServerCommunication is a (still-AngularJS) app service; bridge it so migrated api clients can @Inject it.
export function serverCommunicationFactory(i: any): any { return i.get('ServerCommunication'); }
// WorkflowService hub deps that stay AngularJS: the deepsense-* graph model (Workflow) + cycle
// analyser. Bridged so WorkflowService can @Inject them. (debounce is lodash _.debounce now, not bridged.)
export function workflowFactory(i: any): any { return i.get('Workflow'); }
export function $documentFactory(i: any): any { return i.get('$document'); }
// Editor canvas service still AngularJS (migrate later); bridged for the copy/paste visitor.
export function canvasServiceFactory(i: any): any { return i.get('CanvasService'); }
// deepsense-* node-parameters factory stays AngularJS (deepsense-* migrates late); bridged for GraphNodesService.
export function deepsenseNodeParametersFactory(i: any): any { return i.get('DeepsenseNodeParameters'); }
// Core-canvas finale: bridged for the migrated core-canvas component + its jsplumb-draggable directive
// (AdapterService = jsPlumb adapter, GraphNode = the deepsense graph-node model exposing MOVE event
// constant). The ng2 KeyboardDirective now checks the CDK overlay directly (no $uibModalStack bridge).
export function adapterServiceFactory(i: any): any { return i.get('AdapterService'); }
export function graphNodeFactory(i: any): any { return i.get('GraphNode'); }
// Report table: bridged for the migrated report-table (uses the AngularJS `precision` / `cut` filters).
export function filterFactory(i: any): any { return i.get('$filter'); }
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
  { provide: '$interval', useFactory: $intervalFactory, deps: ['$injector'] },
  { provide: '$q', useFactory: $qFactory, deps: ['$injector'] },
  { provide: '$http', useFactory: $httpFactory, deps: ['$injector'] },
  { provide: 'ServerCommunication', useFactory: serverCommunicationFactory, deps: ['$injector'] },
  { provide: 'Workflow', useFactory: workflowFactory, deps: ['$injector'] },
  { provide: '$document', useFactory: $documentFactory, deps: ['$injector'] },
  { provide: 'CanvasService', useFactory: canvasServiceFactory, deps: ['$injector'] },
  { provide: 'DeepsenseNodeParameters', useFactory: deepsenseNodeParametersFactory, deps: ['$injector'] },
  { provide: 'AdapterService', useFactory: adapterServiceFactory, deps: ['$injector'] },
  { provide: 'GraphNode', useFactory: graphNodeFactory, deps: ['$injector'] },
  { provide: '$filter', useFactory: filterFactory, deps: ['$injector'] },
  { provide: 'Upload', useFactory: uploadFactory, deps: ['$injector'] },
  { provide: 'PresetService', useFactory: presetServiceFactory, deps: ['$injector'] },
  { provide: 'PresetModalLabels', useFactory: presetModalLabelsFactory, deps: ['$injector'] }
];
