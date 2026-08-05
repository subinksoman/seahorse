import 'reflect-metadata';
import 'zone.js';
import '@angular/compiler'; // JIT compiler (no AoT/ngtsc in this custom webpack build) — must load first
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { RouterModule } from '@angular/router';
import { DialogModule } from '@angular/cdk/dialog';
// Import the prebuilt CSS by file path (NODE_MODULES webpack alias) — @angular/cdk's package `exports`
// field doesn't expose the .css subpath, but a direct file path bypasses exports resolution.
import 'NODE_MODULES/@angular/cdk/overlay-prebuilt.css';
import './modal.css';
import './toast.css';
import { ConfirmationModalComponent } from './confirmation-modal.component';
import { DeleteModalComponent } from './delete-modal.component';
import { ExportModalComponent } from './export-modal.component';
import { WorkflowCloneModalComponent } from './workflow-clone-modal.component';
import { NewWorkflowModalComponent } from './new-workflow-modal.component';
import { UploadWorkflowModalComponent } from './upload-workflow-modal.component';
import { CellViewerModalComponent } from './cell-viewer-modal.component';
import { CodeSnippetModalComponent } from './code-snippet-modal.component';
import { ChooseClusterModalComponent } from './choose-cluster-modal.component';
import { PresetModalComponent } from './preset-modal.component';
import { NotebookModalComponent, ErrorMessageModalComponent } from './node-modals.component';
import { DatabaseModalComponent } from './database-modal.component';
import { GoogleSpreadsheetModalComponent } from './google-spreadsheet-modal.component';
import { ExternalFileModalComponent } from './external-file-modal.component';
import { HdfsModalComponent } from './hdfs-modal.component';
import { LibraryDatasourceModalComponent } from './library-datasource-modal.component';
import { LibraryModalComponent } from './library-modal.component';
import { FileUploadSectionComponent } from './file-upload-section.component';
import { ColumnSelectorModalComponent } from './column-selector-modal.component';
import { ReportChartModalComponent, PiePlotComponent, ColumnPlotComponent } from './report-chart-modal.component';
import { FileSettingsComponent } from './file-settings.component';
import { appRoutes } from './app-routes';
import { RouterShellComponent, WorkflowsShellComponent } from './router-shell.component';
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
import { DatasourcesService } from './datasources.service';
import { DatasourcesPanelService } from './datasources-panel.service';
import { AttributesPanelService } from './attributes-panel.service';
import { GraphStyleService } from './graph-style.service';
// The graph-model + node-parameters are framework-agnostic CJS classes now — import them directly to
// provide 'Workflow' / 'DeepsenseNodeParameters' natively (no AngularJS $injector bridge). Same module
// instances the AngularJS backward-compat factories use (webpack dedupes).
import WorkflowClass from '../common/deepsense-components/deepsense-graph-model/deepsense-common-objects/deepsense-common-workflow.js';
import ParameterFactory from '../common/deepsense-components/deepsense-node-parameters/common-parameters/common-parameter-factory.js';
import { CanvasService } from './canvas.service';
import { AdapterService } from './adapter.service';
import { ServerCommunicationService } from './server-communication.service';
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
import { LoadingMaskComponent } from './loading-mask.component';
import { LoadingSpinnerProcessingComponent } from './loading-spinner-processing.component';
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
import { WorkflowsEditorComponent } from './workflows-editor.component';
import { PublicParamsListComponent } from './public-params-list.component';
import { AppRootComponent } from './app-root.component';
import { DroppableDirective } from './droppable.directive';
import { upgradedProviders } from './upgraded-providers';


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

platformBrowserDynamic().bootstrapModule(AppModule).catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[bootstrap] Angular bootstrap failed', err);
});
