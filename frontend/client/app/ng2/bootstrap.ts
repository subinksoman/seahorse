import 'reflect-metadata';
import 'zone.js';
import '@angular/compiler'; // JIT compiler (no AoT/ngtsc in this custom webpack build) — must load first
import { NgModule, DoBootstrap } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { UpgradeModule, downgradeInjectable, downgradeComponent } from '@angular/upgrade/static';
import { HelloAngularService } from './hello.service';
import { UserService } from './user.service';
import { UUIDGenerator } from './uuid-generator.service';
import { TimeService } from './time.service';
import { HelpersService } from './helpers.service';
import { MouseEvent } from './mouse-event.service';
import { EventsService } from './events.service';
import { VersionService } from './version.service';
import { ErrorService } from './error.service';
import { NotificationService } from './notification.service';
import { MultiSelectionService } from './multi-selection.service';
import { BottomBarService } from './bottom-bar.service';
import { DragAndDrop } from './drag-and-drop.service';
import { ConfirmationModalService } from './confirmation-modal.service';
import { ExportModalService } from './export-modal.service';
import { DeleteModalService } from './delete-modal.service';
import { DefaultInnerWorkflowGenerator } from './default-inner-workflow-generator.service';
import { ReportService } from './report.service';
import { ClusterModalService } from './cluster-modal.service';
import { LibraryModalService } from './library-modal.service';
import { OperationsApiClient } from './operations-api-client.service';
import { WorkflowsApiClient } from './workflows-api-client.service';
import { SessionManagerApi } from './session-manager-api.service';
import { OperationsHierarchyService } from './operations-hierarchy.service';
import { WorkflowCloneService } from './workflow-clone.service';
import { OperationsService } from './operations.service';
import { SessionManager } from './session-manager.service';
import { WorkflowService } from './workflow.service';
import { WorkflowStatusBarService } from './workflow-status-bar.service';
import { NodeCopyPasteVisitorService } from './node-copy-paste-visitor.service';
import { CopyPasteService } from './copy-paste.service';
import { LibraryApi } from './library-api.service';
import { LibraryDataConverter } from './library-data-converter.service';
import { LibraryService } from './library.service';
import { WorkflowsEditorService } from './workflows-editor.service';
import { GraphNodesService } from './graph-nodes.service';
import { CreateNodeInvitationComponent } from './create-node-invitation.component';
import { PortStatusTooltipComponent } from './port-status-tooltip.component';
import { BreadcrumbsComponent } from './breadcrumbs.component';
import { FileElementComponent } from './file-element.component';
import { FileListComponent } from './file-list.component';
import { RecentFilesIndicatorComponent } from './recent-files-indicator.component';
import { StatusIconComponent } from './status-icon.component';
import { GraphNodeComponent } from './graph-node.component';
import { SearchOperationComponent } from './search-operation.component';
import { OperationsListComponent } from './operations-list.component';
import { OperationsCatalogueComponent } from './operations-catalogue.component';
import { NewNodeComponent } from './new-node.component';
import { CanvasToolbarComponent } from './canvas-toolbar.component';
import { CoreCanvasComponent } from './core-canvas.component';
import { KeyboardDirective } from './keyboard.directive';
import { JsplumbDraggableDirective } from './jsplumb-draggable.directive';
import { MultiSelectionDirective } from './multi-selection.directive';
import { EditorComponent } from './editor.component';
import { BottomBarComponent } from './bottom-bar.component';
import { FocusElementDirective } from './focus-element.directive';
import { CustomScrollBarDirective } from './custom-scroll-bar.directive';
import { GeneralDataPanelComponent } from './general-data-panel.component';
import { DatasourcesElementComponent } from './datasources-element.component';
import { DatasourcesListComponent } from './datasources-list.component';
import { DatasourcesToolbarComponent } from './datasources-toolbar.component';
import { DatasourcesPanelComponent } from './datasources-panel.component';
import { ReportTableComponent } from './report-table.component';
import { ReportDefaultComponent } from './report-default.component';
import { ReportDataframeFullComponent } from './report-dataframe-full.component';
import { ReportComponent } from './report.component';
import { AttributeStringTypeComponent } from './attribute-string-type.component';
import { AttributeNumericTypeComponent } from './attribute-numeric-type.component';
import { AttributeMultipleNumericTypeComponent } from './attribute-multiple-numeric-type.component';
import { AttributeWorkflowTypeComponent } from './attribute-workflow-type.component';
import { AttributeSaveToLibraryTypeComponent } from './attribute-save-to-library-type.component';
import { AttributeLoadFromLibraryTypeComponent } from './attribute-load-from-library-type.component';
import { LibraryConnectorComponent } from './library-connector.component';
import { AttributeDatasourceComponent } from './attribute-datasource.component';
import { AttributeBooleanTypeComponent } from './attribute-boolean-type.component';
import { AttributeCodeSnippetTypeComponent } from './attribute-code-snippet-type.component';
import { AttributeSelectorTypeComponent } from './attribute-selector-type.component';
import { AttributesSerializedViewComponent } from './attributes-serialized-view.component';
import { AttributesListComponent } from './attributes-list.component';
import { AttributeSingleChoiceTypeComponent } from './attribute-single-choice-type.component';
import { AttributeMultipleChoiceTypeComponent } from './attribute-multiple-choice-type.component';
import { AttributeMultiplierTypeComponent } from './attribute-multiplier-type.component';
import { AttributeDynamicParamTypeComponent } from './attribute-dynamic-param-type.component';
import { AttributesPanelComponent } from './attributes-panel.component';
import { TimeDiffComponent, DeepsenseLoadingSpinnerSmComponent } from './deepsense-attributes-misc.components';
import { SelectionItemsComponent } from './selection-items.component';
import { WorkflowsEditorStatusBarComponent } from './workflows-editor-status-bar.component';
import { MenuItemComponent } from './menu-item.component';
import { StartingPopoverComponent, RunningExecutorPopoverComponent, ExecutorErrorComponent } from './status-bar-popovers.component';
import { NavigationBarComponent } from './navigation-bar.component';
import { ErrorViewComponent } from './error-view.component';
import { HomeComponent } from './home.component';
import { ResizableDirective, ResizableListenerDirective } from './resizable.directive';
import { upgradedProviders } from './upgraded-providers';

declare const angular: any;

// Expose Angular services to AngularJS DI (the two frameworks share one injector tree). Each
// downgraded service replaces its legacy AngularJS registration; consumers are unchanged.
angular.module('ds.lab')
  .factory('helloAngular', downgradeInjectable(HelloAngularService) as any)
  .factory('UserService', downgradeInjectable(UserService) as any) // Phase C-1: migrated to Angular 18
  .factory('UUIDGenerator', downgradeInjectable(UUIDGenerator) as any) // Phase C-1: migrated to Angular 18
  .factory('TimeService', downgradeInjectable(TimeService) as any) // Phase C-1: migrated to Angular 18
  .factory('HelpersService', downgradeInjectable(HelpersService) as any) // Phase C-1: migrated to Angular 18
  .factory('MouseEvent', downgradeInjectable(MouseEvent) as any) // Phase C-1: migrated to Angular 18
  .factory('EventsService', downgradeInjectable(EventsService) as any) // Phase C-1: migrated to Angular 18
  .factory('version', downgradeInjectable(VersionService) as any) // Phase C-1: migrated to Angular 18
  .factory('ErrorService', downgradeInjectable(ErrorService) as any) // Phase C-1: migrated to Angular 18
  .factory('NotificationService', downgradeInjectable(NotificationService) as any) // Phase C-1: migrated to Angular 18
  .factory('MultiSelectionService', downgradeInjectable(MultiSelectionService) as any) // Phase C-1: migrated to Angular 18
  .factory('BottomBarService', downgradeInjectable(BottomBarService) as any) // Phase C-1: migrated to Angular 18
  .factory('DragAndDrop', downgradeInjectable(DragAndDrop) as any) // Phase C-1: migrated to Angular 18
  .factory('ConfirmationModalService', downgradeInjectable(ConfirmationModalService) as any) // Phase C-1: migrated to Angular 18
  .factory('ExportModalService', downgradeInjectable(ExportModalService) as any) // Phase C-1: migrated to Angular 18
  .factory('DeleteModalService', downgradeInjectable(DeleteModalService) as any) // Phase C-1: migrated to Angular 18
  .factory('DefaultInnerWorkflowGenerator', downgradeInjectable(DefaultInnerWorkflowGenerator) as any) // Phase C-1: migrated to Angular 18
  .factory('Report', downgradeInjectable(ReportService) as any) // Phase C-1: migrated to Angular 18
  .factory('ClusterModalService', downgradeInjectable(ClusterModalService) as any) // Phase C-1: migrated to Angular 18
  .factory('LibraryModalService', downgradeInjectable(LibraryModalService) as any) // Phase C-1: migrated to Angular 18
  .factory('OperationsApiClient', downgradeInjectable(OperationsApiClient) as any) // Phase C-1: migrated to Angular 18
  .factory('WorkflowsApiClient', downgradeInjectable(WorkflowsApiClient) as any) // Phase C-1: migrated to Angular 18
  .factory('SessionManagerApi', downgradeInjectable(SessionManagerApi) as any) // Phase C-1: migrated to Angular 18
  .factory('OperationsHierarchyService', downgradeInjectable(OperationsHierarchyService) as any) // Phase C-1: migrated to Angular 18
  .factory('WorkflowCloneService', downgradeInjectable(WorkflowCloneService) as any) // Phase C-1: migrated to Angular 18
  .factory('Operations', downgradeInjectable(OperationsService) as any) // Phase C-1: migrated to Angular 18
  .factory('SessionManager', downgradeInjectable(SessionManager) as any) // Phase C-1: migrated to Angular 18
  .factory('WorkflowService', downgradeInjectable(WorkflowService) as any) // Phase C-1: migrated to Angular 18 (the central editor hub)
  .factory('WorkflowStatusBarService', downgradeInjectable(WorkflowStatusBarService) as any) // Phase C-1: migrated to Angular 18
  .factory('NodeCopyPasteVisitorService', downgradeInjectable(NodeCopyPasteVisitorService) as any) // Phase C-1: migrated to Angular 18
  .factory('CopyPasteService', downgradeInjectable(CopyPasteService) as any) // Phase C-1: migrated to Angular 18
  .factory('LibraryApiService', downgradeInjectable(LibraryApi) as any) // Phase C-1: migrated to Angular 18
  .factory('LibraryDataConverterService', downgradeInjectable(LibraryDataConverter) as any) // Phase C-1: migrated to Angular 18
  .factory('LibraryService', downgradeInjectable(LibraryService) as any) // Phase C-1: migrated to Angular 18
  .factory('WorkflowsEditorService', downgradeInjectable(WorkflowsEditorService) as any) // Phase C-1: migrated to Angular 18
  .factory('GraphNodesService', downgradeInjectable(GraphNodesService) as any) // Phase C-1: migrated to Angular 18
  // Phase C-2 (UI layer): downgraded Angular COMPONENTS registered as AngularJS directives.
  .directive('createNodeInvitation', downgradeComponent({ component: CreateNodeInvitationComponent }) as any)
  .directive('portStatusTooltip', downgradeComponent({ component: PortStatusTooltipComponent }) as any)
  .directive('breadcrumbs', downgradeComponent({ component: BreadcrumbsComponent }) as any)
  .directive('fileElement', downgradeComponent({ component: FileElementComponent }) as any)
  .directive('fileList', downgradeComponent({ component: FileListComponent }) as any)
  .directive('recentFilesIndicator', downgradeComponent({ component: RecentFilesIndicatorComponent }) as any)
  .directive('statusIcon', downgradeComponent({ component: StatusIconComponent }) as any)
  .directive('graphNode', downgradeComponent({ component: GraphNodeComponent }) as any)
  // operations-catalogue cluster: only the cap (operationCatalogue) is used from an AngularJS template
  // (new-node.html); its children operations-list / search-operation live only inside Angular templates.
  .directive('operationCatalogue', downgradeComponent({ component: OperationsCatalogueComponent }) as any)
  .directive('newNode', downgradeComponent({ component: NewNodeComponent }) as any)
  .directive('canvasToolbar', downgradeComponent({ component: CanvasToolbarComponent }) as any)
  // core-canvas finale: only coreCanvas is downgraded (used from AngularJS editor.html); its
  // keyboard/jsplumb-draggable/multi-selection directives live only in the Angular core-canvas template.
  .directive('coreCanvas', downgradeComponent({ component: CoreCanvasComponent }) as any)
  // editor-view orchestrator: used from workflows-editor.html (still AngularJS); ui-router untouched.
  .directive('editor', downgradeComponent({ component: EditorComponent }) as any)
  // editor side panels (incremental): bottom-bar Reports tab.
  .directive('bottomBar', downgradeComponent({ component: BottomBarComponent }) as any)
  // general-data-panel: name/description migrated to Angular; schedules + public-params stay AngularJS,
  // projected in via <ng-content> from workflows-editor.html (keeps the working workflow-schedules widget).
  .directive('generalDataPanel', downgradeComponent({ component: GeneralDataPanelComponent }) as any)
  // datasources subsystem (bottom-up): the list row.
  .directive('datasourcesElement', downgradeComponent({ component: DatasourcesElementComponent }) as any)
  // datasources: only the panel is used from an AngularJS template (workflows-editor.html); list + toolbar
  // (and element) live inside Angular templates now.
  .directive('datasourcesPanel', downgradeComponent({ component: DatasourcesPanelComponent }) as any)
  // report subsystem (bottom-up): the data-sample grid (cell-viewer modal + charts stay AngularJS).
  .directive('reportTable', downgradeComponent({ component: ReportTableComponent }) as any)
  .directive('reportDefault', downgradeComponent({ component: ReportDefaultComponent }) as any)
  .directive('reportDataframeFull', downgradeComponent({ component: ReportDataframeFullComponent }) as any)
  .directive('report', downgradeComponent({ component: ReportComponent }) as any)
  // deepsense-attributes proof-of-pattern leaf (the first of ~38; establishes the [parameter] approach).
  .directive('attributeStringType', downgradeComponent({ component: AttributeStringTypeComponent }) as any)
  .directive('attributeNumericType', downgradeComponent({ component: AttributeNumericTypeComponent }) as any)
  .directive('attributeCreatorType', downgradeComponent({ component: AttributeStringTypeComponent }) as any)
  .directive('attributePrefixBasedCreatorType', downgradeComponent({ component: AttributeStringTypeComponent }) as any)
  .directive('attributeMultipleNumericType', downgradeComponent({ component: AttributeMultipleNumericTypeComponent }) as any)
  .directive('attributeWorkflowType', downgradeComponent({ component: AttributeWorkflowTypeComponent }) as any)
  .directive('attributeSaveToLibrary', downgradeComponent({ component: AttributeSaveToLibraryTypeComponent }) as any)
  .directive('attributeLoadFromLibrary', downgradeComponent({ component: AttributeLoadFromLibraryTypeComponent }) as any)
  .directive('attributeDatasource', downgradeComponent({ component: AttributeDatasourceComponent }) as any)
  .directive('attributeBooleanType', downgradeComponent({ component: AttributeBooleanTypeComponent }) as any)
  .directive('attributeCodeSnippetType', downgradeComponent({ component: AttributeCodeSnippetTypeComponent }) as any)
  .directive('attributeSelectorType', downgradeComponent({ component: AttributeSelectorTypeComponent }) as any)
  .directive('attributesList', downgradeComponent({ component: AttributesListComponent }) as any)
  .directive('deepsenseOperationAttributes', downgradeComponent({ component: AttributesPanelComponent }) as any)
  .directive('selectionItems', downgradeComponent({ component: SelectionItemsComponent }) as any)
  .directive('workflowEditorStatusBar', downgradeComponent({ component: WorkflowsEditorStatusBarComponent }) as any)
  .directive('navigationBar', downgradeComponent({ component: NavigationBarComponent }) as any)
  .directive('errorView', downgradeComponent({ component: ErrorViewComponent }) as any)
  .directive('homeView', downgradeComponent({ component: HomeComponent }) as any);

@NgModule({
  imports: [BrowserModule, UpgradeModule],
  // Angular components used from AngularJS (via downgradeComponent) must be declared here.
  declarations: [CreateNodeInvitationComponent, PortStatusTooltipComponent, BreadcrumbsComponent, FileElementComponent, FileListComponent, RecentFilesIndicatorComponent, StatusIconComponent, GraphNodeComponent, SearchOperationComponent, OperationsListComponent, OperationsCatalogueComponent, NewNodeComponent, CanvasToolbarComponent, CoreCanvasComponent, KeyboardDirective, JsplumbDraggableDirective, MultiSelectionDirective, EditorComponent, BottomBarComponent, FocusElementDirective, CustomScrollBarDirective, GeneralDataPanelComponent, DatasourcesElementComponent, DatasourcesListComponent, DatasourcesToolbarComponent, DatasourcesPanelComponent, ReportTableComponent, ReportDefaultComponent, ReportDataframeFullComponent, ReportComponent, AttributeStringTypeComponent, AttributeNumericTypeComponent, AttributeMultipleNumericTypeComponent, AttributeWorkflowTypeComponent, AttributeSaveToLibraryTypeComponent, AttributeLoadFromLibraryTypeComponent, LibraryConnectorComponent, AttributeDatasourceComponent, AttributeBooleanTypeComponent, AttributeCodeSnippetTypeComponent, AttributeSelectorTypeComponent, AttributesSerializedViewComponent, AttributesListComponent, AttributeSingleChoiceTypeComponent, AttributeMultipleChoiceTypeComponent, AttributeMultiplierTypeComponent, AttributeDynamicParamTypeComponent, AttributesPanelComponent, TimeDiffComponent, DeepsenseLoadingSpinnerSmComponent, SelectionItemsComponent, WorkflowsEditorStatusBarComponent, MenuItemComponent, StartingPopoverComponent, RunningExecutorPopoverComponent, ExecutorErrorComponent, NavigationBarComponent, ErrorViewComponent, HomeComponent, ResizableDirective, ResizableListenerDirective],
  // Bridge AngularJS core (e.g. $rootScope) and constants (config) into the Angular injector so
  // migrated services can inject them by string token. See upgraded-providers.ts.
  providers: [...upgradedProviders]
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
