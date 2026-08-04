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
export function $intervalFactory(i: any): any { return i.get('$interval'); }
export function $uibModalFactory(i: any): any { return i.get('$uibModal'); } // angular-ui-bootstrap
export function $cookiesFactory(i: any): any { return i.get('$cookies'); } // ngCookies
export function $qFactory(i: any): any { return i.get('$q'); }
export function $httpFactory(i: any): any { return i.get('$http'); }
// ServerCommunication is a (still-AngularJS) app service; bridge it so migrated api clients can @Inject it.
export function serverCommunicationFactory(i: any): any { return i.get('ServerCommunication'); }
// WorkflowService hub deps that stay AngularJS: the deepsense-* graph model (Workflow) + cycle
// analyser, and the 3rd-party angular-debounce ('debounce'). Bridged so WorkflowService can @Inject them.
export function workflowFactory(i: any): any { return i.get('Workflow'); }
export function deepsenseCycleAnalyserFactory(i: any): any { return i.get('DeepsenseCycleAnalyser'); }
export function debounceFactory(i: any): any { return i.get('debounce'); }
export function $documentFactory(i: any): any { return i.get('$document'); }
// Editor canvas service still AngularJS (migrate later); bridged for the copy/paste visitor.
export function canvasServiceFactory(i: any): any { return i.get('CanvasService'); }
// deepsense-* node-parameters factory stays AngularJS (deepsense-* migrates late); bridged for GraphNodesService.
export function deepsenseNodeParametersFactory(i: any): any { return i.get('DeepsenseNodeParameters'); }
// Canvas: bridged for the migrated graph-node component (border colours + datasource-node behaviour).
export function graphStyleServiceFactory(i: any): any { return i.get('GraphStyleService'); }
export function datasourcesServiceFactory(i: any): any { return i.get('datasourcesService'); }
export function datasourcesPanelServiceFactory(i: any): any { return i.get('DatasourcesPanelService'); }
// Core-canvas finale: bridged for the migrated core-canvas component + its jsplumb-draggable/keyboard
// directives (AdapterService = jsPlumb adapter, $uibModalStack = keyboard modal guard, GraphNode = the
// deepsense graph-node model exposing MOVE event constant).
export function adapterServiceFactory(i: any): any { return i.get('AdapterService'); }
export function uibModalStackFactory(i: any): any { return i.get('$uibModalStack'); }
export function graphNodeFactory(i: any): any { return i.get('GraphNode'); }
// Datasources panel: bridged for the migrated datasources-element (opens the add/edit datasource modals).
export function datasourcesModalsServiceFactory(i: any): any { return i.get('DatasourcesModalsService'); }
// Report table: bridged for the migrated report-table (uses the AngularJS `precision` / `cut` filters).
export function filterFactory(i: any): any { return i.get('$filter'); }
// deepsense-attributes: bridged for migrated attribute-types (disabled-mode + panel interactions).
export function attributesPanelServiceFactory(i: any): any { return i.get('AttributesPanelService'); }
// attributes-panel: bridged for the Jupyter notebook URL (trustAsResourceUrl).
export function sceFactory(i: any): any { return i.get('$sce'); }
// Router track: ui-router's $state / $stateParams, bridged for the migrated routed views (home,
// error-view). These go away when ui-router is swapped for @angular/router (Router/ActivatedRoute).
export function stateFactory(i: any): any { return i.get('$state'); }
export function stateParamsFactory(i: any): any { return i.get('$stateParams'); }

export const upgradedProviders: any[] = [
  { provide: '$rootScope', useFactory: $rootScopeFactory, deps: ['$injector'] },
  { provide: 'config', useFactory: configFactory, deps: ['$injector'] },
  { provide: '$log', useFactory: $logFactory, deps: ['$injector'] },
  { provide: 'toastr', useFactory: toastrFactory, deps: ['$injector'] },
  { provide: '$timeout', useFactory: $timeoutFactory, deps: ['$injector'] },
  { provide: '$interval', useFactory: $intervalFactory, deps: ['$injector'] },
  { provide: '$uibModal', useFactory: $uibModalFactory, deps: ['$injector'] },
  { provide: '$cookies', useFactory: $cookiesFactory, deps: ['$injector'] },
  { provide: '$q', useFactory: $qFactory, deps: ['$injector'] },
  { provide: '$http', useFactory: $httpFactory, deps: ['$injector'] },
  { provide: 'ServerCommunication', useFactory: serverCommunicationFactory, deps: ['$injector'] },
  { provide: 'Workflow', useFactory: workflowFactory, deps: ['$injector'] },
  { provide: 'DeepsenseCycleAnalyser', useFactory: deepsenseCycleAnalyserFactory, deps: ['$injector'] },
  { provide: 'debounce', useFactory: debounceFactory, deps: ['$injector'] },
  { provide: '$document', useFactory: $documentFactory, deps: ['$injector'] },
  { provide: 'CanvasService', useFactory: canvasServiceFactory, deps: ['$injector'] },
  { provide: 'DeepsenseNodeParameters', useFactory: deepsenseNodeParametersFactory, deps: ['$injector'] },
  { provide: 'GraphStyleService', useFactory: graphStyleServiceFactory, deps: ['$injector'] },
  { provide: 'datasourcesService', useFactory: datasourcesServiceFactory, deps: ['$injector'] },
  { provide: 'DatasourcesPanelService', useFactory: datasourcesPanelServiceFactory, deps: ['$injector'] },
  { provide: 'AdapterService', useFactory: adapterServiceFactory, deps: ['$injector'] },
  { provide: '$uibModalStack', useFactory: uibModalStackFactory, deps: ['$injector'] },
  { provide: 'GraphNode', useFactory: graphNodeFactory, deps: ['$injector'] },
  { provide: 'DatasourcesModalsService', useFactory: datasourcesModalsServiceFactory, deps: ['$injector'] },
  { provide: '$filter', useFactory: filterFactory, deps: ['$injector'] },
  { provide: 'AttributesPanelService', useFactory: attributesPanelServiceFactory, deps: ['$injector'] },
  { provide: '$sce', useFactory: sceFactory, deps: ['$injector'] },
  { provide: '$state', useFactory: stateFactory, deps: ['$injector'] },
  { provide: '$stateParams', useFactory: stateParamsFactory, deps: ['$injector'] }
];
