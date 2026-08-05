import 'reflect-metadata';
import 'zone.js';
import '@angular/compiler'; // JIT compiler (no AoT/ngtsc in this custom webpack build) — must load first
import { NgModule, enableProdMode } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { RouterModule } from '@angular/router';
import { DialogModule } from '@angular/cdk/dialog';
// Import the prebuilt CSS by file path (NODE_MODULES webpack alias) — @angular/cdk's package `exports`
// field doesn't expose the .css subpath, but a direct file path bypasses exports resolution.
import 'NODE_MODULES/@angular/cdk/overlay-prebuilt.css';
import './modals/modal.css';
import './modals/toast.css';
import { ConfirmationModalComponent } from './modals/confirmation-modal.component';
import { DeleteModalComponent } from './modals/delete-modal.component';
import { ExportModalComponent } from './modals/export-modal.component';
import { WorkflowCloneModalComponent } from './modals/workflow-clone-modal.component';
import { NewWorkflowModalComponent } from './modals/new-workflow-modal.component';
import { UploadWorkflowModalComponent } from './modals/upload-workflow-modal.component';
import { CellViewerModalComponent } from './modals/cell-viewer-modal.component';
import { CodeSnippetModalComponent } from './modals/code-snippet-modal.component';
import { ChooseClusterModalComponent } from './modals/choose-cluster-modal.component';
import { PresetModalComponent } from './modals/preset-modal.component';
import { NotebookModalComponent, ErrorMessageModalComponent } from './modals/node-modals.component';
import { DatabaseModalComponent } from './modals/database-modal.component';
import { GoogleSpreadsheetModalComponent } from './modals/google-spreadsheet-modal.component';
import { ExternalFileModalComponent } from './modals/external-file-modal.component';
import { HdfsModalComponent } from './modals/hdfs-modal.component';
import { LibraryDatasourceModalComponent } from './modals/library-datasource-modal.component';
import { LibraryModalComponent } from './modals/library-modal.component';
import { FileUploadSectionComponent } from './components/file-upload-section.component';
import { ColumnSelectorModalComponent } from './modals/column-selector-modal.component';
import { ReportChartModalComponent, PiePlotComponent, ColumnPlotComponent } from './modals/report-chart-modal.component';
import { FileSettingsComponent } from './components/file-settings.component';
import { appRoutes } from './app-routes';
import { RouterShellComponent, WorkflowsShellComponent } from './components/router-shell.component';
import { HelloAngularService } from './services/hello.service';
import { UserService } from './services/user.service';
import { UUIDGenerator } from './services/uuid-generator.service';
import { TimeService } from './services/time.service';
import { HelpersService } from './services/helpers.service';
import { MouseEvent } from './services/mouse-event.service';
import { EventsService } from './services/events.service';
import { VersionService } from './services/version.service';
import { ErrorService } from './services/error.service';
import { NotificationService } from './services/notification.service';
import { MultiSelectionService } from './services/multi-selection.service';
import { BottomBarService } from './services/bottom-bar.service';
import { DragAndDrop } from './services/drag-and-drop.service';
import { ConfirmationModalService } from './services/confirmation-modal.service';
import { ExportModalService } from './services/export-modal.service';
import { DeleteModalService } from './services/delete-modal.service';
import { DefaultInnerWorkflowGenerator } from './services/default-inner-workflow-generator.service';
import { ReportService } from './services/report.service';
import { ClusterModalService } from './services/cluster-modal.service';
import { LibraryModalService } from './services/library-modal.service';
import { DatasourcesService } from './services/datasources.service';
import { DatasourcesPanelService } from './services/datasources-panel.service';
import { AttributesPanelService } from './services/attributes-panel.service';
import { GraphStyleService } from './services/graph-style.service';
// The graph-model + node-parameters are framework-agnostic CJS classes now — import them directly to
// provide 'Workflow' / 'DeepsenseNodeParameters' natively (no AngularJS $injector bridge). Same module
// instances the AngularJS backward-compat factories use (webpack dedupes).
import WorkflowClass from '../common/deepsense-components/deepsense-graph-model/deepsense-common-objects/deepsense-common-workflow.js';
import ParameterFactory from '../common/deepsense-components/deepsense-node-parameters/common-parameters/common-parameter-factory.js';
import { CanvasService } from './services/canvas.service';
import { AdapterService } from './services/adapter.service';
import { ServerCommunicationService } from './services/server-communication.service';
import { OperationsApiClient } from './api/operations-api-client.service';
import { WorkflowsApiClient } from './api/workflows-api-client.service';
import { SessionManagerApi } from './api/session-manager-api.service';
import { OperationsHierarchyService } from './services/operations-hierarchy.service';
import { WorkflowCloneService } from './services/workflow-clone.service';
import { OperationsService } from './services/operations.service';
import { SessionManager } from './services/session-manager.service';
import { WorkflowService } from './services/workflow.service';
import { WorkflowStatusBarService } from './services/workflow-status-bar.service';
import { NodeCopyPasteVisitorService } from './services/node-copy-paste-visitor.service';
import { CopyPasteService } from './services/copy-paste.service';
import { LibraryApi } from './api/library-api.service';
import { LibraryDataConverter } from './services/library-data-converter.service';
import { LibraryService } from './services/library.service';
import { WorkflowsEditorService } from './services/workflows-editor.service';
import { GraphNodesService } from './services/graph-nodes.service';
import { CreateNodeInvitationComponent } from './components/create-node-invitation.component';
import { PortStatusTooltipComponent } from './components/port-status-tooltip.component';
import { BreadcrumbsComponent } from './components/breadcrumbs.component';
import { LoadingMaskComponent } from './components/loading-mask.component';
import { LoadingSpinnerProcessingComponent } from './components/loading-spinner-processing.component';
import { FileElementComponent } from './components/file-element.component';
import { FileListComponent } from './components/file-list.component';
import { RecentFilesIndicatorComponent } from './components/recent-files-indicator.component';
import { StatusIconComponent } from './components/status-icon.component';
import { GraphNodeComponent } from './components/graph-node.component';
import { SearchOperationComponent } from './components/search-operation.component';
import { OperationsListComponent } from './components/operations-list.component';
import { OperationsCatalogueComponent } from './components/operations-catalogue.component';
import { NewNodeComponent } from './components/new-node.component';
import { CanvasToolbarComponent } from './components/canvas-toolbar.component';
import { CoreCanvasComponent } from './components/core-canvas.component';
import { KeyboardDirective } from './directives/keyboard.directive';
import { JsplumbDraggableDirective } from './directives/jsplumb-draggable.directive';
import { MultiSelectionDirective } from './directives/multi-selection.directive';
import { EditorComponent } from './components/editor.component';
import { BottomBarComponent } from './components/bottom-bar.component';
import { FocusElementDirective } from './directives/focus-element.directive';
import { CustomScrollBarDirective } from './directives/custom-scroll-bar.directive';
import { GeneralDataPanelComponent } from './components/general-data-panel.component';
import { DatasourcesElementComponent } from './components/datasources-element.component';
import { DatasourcesListComponent } from './components/datasources-list.component';
import { DatasourcesToolbarComponent } from './components/datasources-toolbar.component';
import { DatasourcesPanelComponent } from './components/datasources-panel.component';
import { ReportTableComponent } from './components/report-table.component';
import { ReportDefaultComponent } from './components/report-default.component';
import { ReportDataframeFullComponent } from './components/report-dataframe-full.component';
import { ReportComponent } from './components/report.component';
import { AttributeStringTypeComponent } from './components/attribute-string-type.component';
import { AttributeNumericTypeComponent } from './components/attribute-numeric-type.component';
import { AttributeMultipleNumericTypeComponent } from './components/attribute-multiple-numeric-type.component';
import { AttributeWorkflowTypeComponent } from './components/attribute-workflow-type.component';
import { AttributeSaveToLibraryTypeComponent } from './components/attribute-save-to-library-type.component';
import { AttributeLoadFromLibraryTypeComponent } from './components/attribute-load-from-library-type.component';
import { LibraryConnectorComponent } from './components/library-connector.component';
import { AttributeDatasourceComponent } from './components/attribute-datasource.component';
import { AttributeBooleanTypeComponent } from './components/attribute-boolean-type.component';
import { AttributeCodeSnippetTypeComponent } from './components/attribute-code-snippet-type.component';
import { AttributeSelectorTypeComponent } from './components/attribute-selector-type.component';
import { AttributesSerializedViewComponent } from './components/attributes-serialized-view.component';
import { AttributesListComponent } from './components/attributes-list.component';
import { AttributeSingleChoiceTypeComponent } from './components/attribute-single-choice-type.component';
import { AttributeMultipleChoiceTypeComponent } from './components/attribute-multiple-choice-type.component';
import { AttributeMultiplierTypeComponent } from './components/attribute-multiplier-type.component';
import { AttributeDynamicParamTypeComponent } from './components/attribute-dynamic-param-type.component';
import { AttributesPanelComponent } from './components/attributes-panel.component';
import { TimeDiffComponent, DeepsenseLoadingSpinnerSmComponent } from './components/deepsense-attributes-misc.components';
import { SelectionItemsComponent } from './components/selection-items.component';
import { WorkflowsEditorStatusBarComponent } from './components/workflows-editor-status-bar.component';
import { MenuItemComponent } from './components/menu-item.component';
import { StartingPopoverComponent, RunningExecutorPopoverComponent, ExecutorErrorComponent } from './components/status-bar-popovers.component';
import { NavigationBarComponent } from './components/navigation-bar.component';
import { ErrorViewComponent } from './components/error-view.component';
import { HomeComponent } from './components/home.component';
import { ResizableDirective, ResizableListenerDirective } from './directives/resizable.directive';
import { WorkflowsEditorComponent } from './components/workflows-editor.component';
import { PublicParamsListComponent } from './components/public-params-list.component';
import { AppRootComponent } from './core/app-root.component';
import { DroppableDirective } from './directives/droppable.directive';
import { upgradedProviders } from './core/upgraded-providers';


@NgModule({
  imports: [BrowserModule, DialogModule,
    // THE FLIP: Angular now owns the app end-to-end. AppRootComponent is the bootstrapped root
    // (see index.html <app-root>), so the router's initial navigation fires automatically — no more
    // initialNavigation:'disabled' + manual kick, no UpgradeModule, no AngularJS.
    RouterModule.forRoot(appRoutes, { useHash: true })],
  declarations: [AppRootComponent, DroppableDirective, LoadingMaskComponent, LoadingSpinnerProcessingComponent, CreateNodeInvitationComponent, PortStatusTooltipComponent, BreadcrumbsComponent, FileElementComponent, FileListComponent, RecentFilesIndicatorComponent, StatusIconComponent, GraphNodeComponent, SearchOperationComponent, OperationsListComponent, OperationsCatalogueComponent, NewNodeComponent, CanvasToolbarComponent, CoreCanvasComponent, KeyboardDirective, JsplumbDraggableDirective, MultiSelectionDirective, EditorComponent, BottomBarComponent, FocusElementDirective, CustomScrollBarDirective, GeneralDataPanelComponent, DatasourcesElementComponent, DatasourcesListComponent, DatasourcesToolbarComponent, DatasourcesPanelComponent, ReportTableComponent, ReportDefaultComponent, ReportDataframeFullComponent, ReportComponent, AttributeStringTypeComponent, AttributeNumericTypeComponent, AttributeMultipleNumericTypeComponent, AttributeWorkflowTypeComponent, AttributeSaveToLibraryTypeComponent, AttributeLoadFromLibraryTypeComponent, LibraryConnectorComponent, AttributeDatasourceComponent, AttributeBooleanTypeComponent, AttributeCodeSnippetTypeComponent, AttributeSelectorTypeComponent, AttributesSerializedViewComponent, AttributesListComponent, AttributeSingleChoiceTypeComponent, AttributeMultipleChoiceTypeComponent, AttributeMultiplierTypeComponent, AttributeDynamicParamTypeComponent, AttributesPanelComponent, TimeDiffComponent, DeepsenseLoadingSpinnerSmComponent, SelectionItemsComponent, WorkflowsEditorStatusBarComponent, MenuItemComponent, StartingPopoverComponent, RunningExecutorPopoverComponent, ExecutorErrorComponent, NavigationBarComponent, ErrorViewComponent, HomeComponent, ResizableDirective, ResizableListenerDirective, WorkflowsEditorComponent, PublicParamsListComponent, RouterShellComponent, WorkflowsShellComponent, ConfirmationModalComponent, DeleteModalComponent, ExportModalComponent, WorkflowCloneModalComponent, NewWorkflowModalComponent, UploadWorkflowModalComponent, CellViewerModalComponent, CodeSnippetModalComponent, ChooseClusterModalComponent, PresetModalComponent, NotebookModalComponent, ErrorMessageModalComponent, DatabaseModalComponent, GoogleSpreadsheetModalComponent, ExternalFileModalComponent, HdfsModalComponent, FileSettingsComponent, LibraryDatasourceModalComponent, LibraryModalComponent, FileUploadSectionComponent, ColumnSelectorModalComponent, ReportChartModalComponent, PiePlotComponent, ColumnPlotComponent],
  // String-token providers the migrated code still injects. '$rootScope' + 'config' are now NATIVE
  // (the RootScopeService emulator + window.__seahorseConfig — see upgraded-providers.ts), not AngularJS
  // bridges. The rest alias string tokens onto native Angular classes so @Inject('X') resolves without
  // AngularJS: LibraryModalService/datasources*/AttributesPanel/GraphStyle/Canvas/Adapter/ServerComm are
  // providedIn-root classes; Workflow + DeepsenseNodeParameters are framework-agnostic CJS values.
  providers: [...upgradedProviders,
    { provide: 'LibraryModalService', useExisting: LibraryModalService },
    { provide: 'datasourcesService', useExisting: DatasourcesService },
    { provide: 'DatasourcesPanelService', useExisting: DatasourcesPanelService },
    { provide: 'AttributesPanelService', useExisting: AttributesPanelService },
    { provide: 'Workflow', useValue: WorkflowClass },
    { provide: 'DeepsenseNodeParameters', useValue: { factory: ParameterFactory } },
    { provide: 'GraphStyleService', useExisting: GraphStyleService },
    { provide: 'CanvasService', useExisting: CanvasService },
    { provide: 'AdapterService', useExisting: AdapterService },
    { provide: 'ServerCommunication', useExisting: ServerCommunicationService }],
  bootstrap: [AppRootComponent]
})
export class AppModule {}

// Production bundle: run Angular in prod mode. Besides the perf win, it disables the dev-mode
// double-check that asserts NG0100 (ExpressionChangedAfterItHasBeenCheckedError) — essential now that
// RootScopeService drives change detection on a periodic appRef.tick(), which legitimately catches
// async state (session/loading flags) mid-settle between ticks; prod mode does one clean CD pass and
// the next tick reconciles. (The hybrid never hit this because AngularJS's own digest kept the zone
// busy so Angular's zone-driven CD always ran at stable moments.)
enableProdMode();
platformBrowserDynamic().bootstrapModule(AppModule).catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[bootstrap] Angular bootstrap failed', err);
});
