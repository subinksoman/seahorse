/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Component, OnInit, OnDestroy, DoCheck, Inject } from '@angular/core';
import * as _ from 'lodash';
import { WorkflowCloneService } from './workflow-clone.service';
import { ReportService } from './report.service';
import { MultiSelectionService } from './multi-selection.service';
import { WorkflowService } from './workflow.service';
import { ConfirmationModalService } from './confirmation-modal.service';
import { ExportModalService } from './export-modal.service';
import { GraphNodesService } from './graph-nodes.service';
import { NotificationService } from './notification.service';
import { CopyPasteService } from './copy-paste.service';
import { BottomBarService } from './bottom-bar.service';
import { NodeCopyPasteVisitorService } from './node-copy-paste-visitor.service';
import { EventsService } from './events.service';
import { WorkflowsEditorService } from './workflows-editor.service';
import { MouseEvent as MouseEventService } from './mouse-event.service';

// Phase C / router track (step 3): migrated from workflows-editor/workflows-editor.controller.js +
// workflows-editor.html — the editor's event orchestrator (the "brain"). Downgraded 'workflowsEditor';
// the ui-router 'workflows.editor' state template now hosts <workflows-editor>. The state RESOLVE
// (download workflow + load operations + init ServerCommunication) still runs in AngularJS ui-router
// and hands the result to this component via $rootScope._workflowWithResults (read in ngOnInit) — this
// preserves the async gate (the component renders only after the resolve completes). The ~15
// $scope.$on listeners become bridged $rootScope.$on registrations torn down in ngOnDestroy (AngularJS
// $emit bubbles to $rootScope and $broadcast reaches it, so $rootScope.$on catches them all); the 4
// $scope/$rootScope.$watch become ngDoCheck. The template's downgraded children are now hosted as
// their native Angular components (camelCase inputs); resizable/resizable-listener/custom-scroll-bar
// are the Angular directive ports; workflow-schedules is UpgradeComponent-wrapped (stays AngularJS);
// public-params-list is native Angular.
@Component({
  standalone: false,
  selector: 'workflows-editor',
  template: `
    <div class="c-workflow-container">
      <section class="c-workflow-container__content" resizable-listener="height">

        <div [ngClass]="{'active': isDatasourcesOpened}" class="datasources-component__mask"></div>

        <div class="datasources-component__wrapper" [ngClass]="{'active': isDatasourcesOpened}">
          <div (click)="closeDatasources()" class="cross">X</div>
          <datasources-panel></datasources-panel>
        </div>

        <editor
          class="c-workflow-container__editor"
          [isEditable]="isEditable()"
          [workflow]="getWorkflow()">
        </editor>

        <deepsense-operation-attributes
          *ngIf="getSelectedNode()"
          [workflowId]="getWorkflow().id"
          [publicParams]="getWorkflow().publicParams"
          [isInnerWorkflow]="getWorkflow().workflowType === 'inner'"
          [node]="getSelectedNode()"
          [disabledMode]="!isEditable()"
          class="o-panel o-panel--scroll-right animated fadeInRight right-panel-resizable"
          custom-scroll-bar
          resizable
          resizable-panel-name="rightPanel"
          resizable-position="left">
        </deepsense-operation-attributes>

        <general-data-panel
          *ngIf="!getSelectedNode()"
          [workflow]="getWorkflow()"
          [name]="getWorkflow().name"
          (nameChange)="getWorkflow().name = $event"
          class="right-panel-resizable"
          [description]="getWorkflow().description"
          (descriptionChange)="getWorkflow().description = $event"
          [disabledMode]="!isEditable()"
          resizable
          resizable-panel-name="rightPanel"
          resizable-position="left"
          resizable-add-shift="-10">
          <section class="ibox-content o-general-data-panel__content">
            <header>
              <p class="o-general-data-panel__header">Schedules:</p>
              <workflow-schedules [workflow]="getWorkflow()"></workflow-schedules>
            </header>
          </section>
          <section *ngIf="getWorkflow().publicParams?.length > 0">
            <public-params-list
              [workflow]="getWorkflow()"
              [publicParams]="getWorkflow().publicParams">
            </public-params-list>
          </section>
        </general-data-panel>
      </section>

      <section
        class="c-bottom-tabs"
        resizable
        resizable-panel-name="bottomTab"
        resizable-via-listener=".c-workflow-container__content"
        resizable-invisible="true"
        resizable-position="top"
        resizable-min-start="25"
        [style.display]="BottomBarData.reportTab ? null : 'none'">
        <report [report]="report" *ngIf="BottomBarData.reportTab"></report>
      </section>

      <bottom-bar></bottom-bar>
    </div>
  `
})
export class WorkflowsEditorComponent implements OnInit, OnDestroy, DoCheck {
  selectedNode: any = null;
  selectedPortObject: any = null;
  report: any = null;
  isDatasourcesOpened = false;
  BottomBarData: any;

  private workflowWithResults: any;
  private inited = false;
  private _editableModeEventListeners: Array<() => void> = [];
  private _staticListeners: Array<() => void> = [];
  private _prevName: any;
  private _prevWorkflow: any;

  constructor(
    @Inject('$rootScope') private $rootScope: any,
    @Inject('$state') private $state: any,
    @Inject('ServerCommunication') private serverCommunication: any,
    @Inject('AdapterService') private adapterService: any,
    @Inject('DatasourcesPanelService') private datasourcesPanelService: any,
    private workflowCloneService: WorkflowCloneService,
    private reportService: ReportService,
    private multiSelectionService: MultiSelectionService,
    private workflowService: WorkflowService,
    private confirmationModalService: ConfirmationModalService,
    private exportModalService: ExportModalService,
    private graphNodesService: GraphNodesService,
    private notificationService: NotificationService,
    private copyPasteService: CopyPasteService,
    private bottomBarService: BottomBarService,
    private nodeCopyPasteVisitorService: NodeCopyPasteVisitorService,
    private eventsService: EventsService,
    private workflowsEditorService: WorkflowsEditorService,
    private mouseEvent: MouseEventService
  ) {}

  ngOnInit(): void {
    // initRootWorkflow already ran in the ui-router resolve (so getCurrentWorkflow() is ready before
    // the parent-state status bar constructs); here we just finish the controller's setup.
    this.workflowWithResults = this.$rootScope._workflowWithResults;

    this.adapterService.setMouseClickOnPortFunction((data: any) => this.openReport(data));
    this.BottomBarData = (this.bottomBarService as any).tabsState;

    this.init(this.workflowWithResults);
  }

  ngDoCheck(): void {
    const wf = (this.workflowService as any).getCurrentWorkflow();
    const name = wf && wf.name;
    if (name !== this._prevName) {
      this._prevName = name;
      this.$rootScope.pageTitle = name;
    }
    if ((this.multiSelectionService as any).getSelectedNodeIds().length === 0) {
      this.selectedNode = null;
    }
    this.isDatasourcesOpened = this.datasourcesPanelService.isDatasourcesOpened;
    if (wf !== this._prevWorkflow) {
      this._prevWorkflow = wf;
      this.unselectNode();
    }
  }

  ngOnDestroy(): void {
    this.adapterService.reset();
    (this.notificationService as any).clearToasts();
    this._unbindEditorListeners();
    this._staticListeners.forEach((off) => off());
    this._staticListeners = [];
  }

  closeDatasources(): void {
    this.datasourcesPanelService.closeDatasources();
  }

  private _loadReports(data: any): void {
    const report = data.resultEntities;
    if (!_.isEmpty(report)) {
      (this.workflowService as any).getCurrentWorkflow().setPortTypesFromReport(report);
      (this.reportService as any).createReportEntities(report.id, report);
      this._initReportListeners();
    }
  }

  openReport(data: any): void {
    const workflow = (this.workflowService as any).getCurrentWorkflow();
    const node = workflow.getNodeById(data.port.nodeId);
    this.selectedPortObject = { portIdx: data.port.index, node };
    const reportEntityId = node.getResult(data.reference.getParameter('portIndex'));
    this.loadReportById(reportEntityId);
    (this.reportService as any).openReport();
  }

  private _initReportListeners(): void {
    if (this.inited) { return; }
    this.inited = true;
  }

  init(workflowWithResults: any): void {
    (this.workflowService as any).getCurrentWorkflow().updateState(workflowWithResults.executionReport);
    this.initListeners();
    if ((this.workflowService as any).isWorkflowRunning()) {
      this._setRunningMode();
    }
    this._loadReports(workflowWithResults.executionReport);
  }

  initListeners(): void {
    const $rs = this.$rootScope;
    this._staticListeners = [
      $rs.$on('ServerCommunication.MESSAGE.executionStatus', (_event: any, data: any) => {
        this.getWorkflow().updateState(data);
        this._loadReports(data);
        if (this.selectedPortObject) {
          this.report = null;
          const reportEntityId = this.selectedPortObject.node.state.results[this.selectedPortObject.portIdx];
          this.loadReportById(reportEntityId);
        }
        if ((this.workflowService as any).isWorkflowRunning()) { this._setRunningMode(); } else { this._setEditableMode(); }
        this.adapterService.render();
      }),

      $rs.$on('ServerCommunication.MESSAGE.inferredState', (_event: any, data: any) => {
        const currentWorkflow = (this.workflowService as any).getCurrentWorkflow();
        if (data.id === currentWorkflow.id) {
          this.updateAndRerenderEdges(data);
          if (data.states) {
            (this.workflowService as any).onInferredState(data.states);
            if ((this.workflowService as any).isWorkflowRunning()) { this._setRunningMode(); } else { this._setEditableMode(); }
          }
        }
      }),

      $rs.$on('StatusBar.RUN', () => {
        this._setRunningMode();
        const nodesToExecute = (this.multiSelectionService as any).getSelectedNodeIds();
        this.serverCommunication.sendLaunchToWorkflowExchange(nodesToExecute);
      }),

      $rs.$on('AttributePanel.UNSELECT_NODE', () => { this.selectedNode = null; }),

      $rs.$on('StatusBar.ABORT', () => {
        (this.workflowService as any).getCurrentWorkflow().workflowStatus = 'aborting';
        this.serverCommunication.sendAbortToWorkflowExchange();
      }),

      $rs.$on('GraphNode.CLICK', (_event: any, data: any) => {
        const isModKeyDown = (this.mouseEvent as any).isModKeyDown(data.originalEvent);
        if (!isModKeyDown) {
          this.selectedNode = data.selectedNode;
          this.loadParametersForNode();
        } else if (isModKeyDown && this.selectedNode && this.selectedNode.id === data.selectedNode.id) {
          this.unselectNode();
        }
      }),

      $rs.$on('StatusBar.CLONE_WORKFLOW', () => {
        const currentWorkflow = (this.workflowService as any).getCurrentWorkflow();
        (this.workflowCloneService as any).openModal(this._goToWorkflow.bind(this), currentWorkflow);
      }),

      $rs.$on('StatusBar.EXPORT_CLICK', () => { (this.exportModalService as any).showModal(); })
    ];

    this._reinitEditableModeListeners();
  }

  private _reinitEditableModeListeners(): void {
    this._unbindEditorListeners();
    const $rs = this.$rootScope;
    this._editableModeEventListeners = [
      $rs.$on('Edge.CREATE', (_data: any, args: any) => {
        this.getWorkflow().addEdge(args.edge);
        (this.workflowService as any).updateEdgesStates();
      }),
      $rs.$on('Edge.REMOVE', (_data: any, args: any) => {
        this.getWorkflow().removeEdge(args.edge);
      }),
      $rs.$on('Keyboard.KEY_PRESSED_DEL', () => {
        if ((this.multiSelectionService as any).getSelectedNodeIds().length > 0) {
          (this.workflowsEditorService as any).handleDelete();
        }
      }),
      (this.eventsService as any).on((this.eventsService as any).EVENTS.WORKFLOW_DELETE_SELECTED_ELEMENT,
        this._handleDelete.bind(this))
    ];
  }

  private _goToWorkflow(workflow: any): void {
    const id = workflow.workflowId;
    this.serverCommunication.unsubscribeFromAllExchanges();
    this.$state.go(this.$state.current, { id }, { reload: true });
  }

  loadParametersForNode(): void {
    (this.graphNodesService as any).getNodeParameters(this.selectedNode);
  }

  private _setRunningMode(): void {
    this._unbindEditorListeners();
    (this.workflowService as any).getCurrentWorkflow().workflowStatus = 'running';
    (this.copyPasteService as any).setEnabled(false);
    this.$rootScope.$broadcast('WorkflowEditor.RUNNING_MODE_SET');
  }

  private _setEditableMode(): void {
    this._reinitEditableModeListeners();
    (this.workflowService as any).getCurrentWorkflow().workflowStatus = 'editor';
    (this.copyPasteService as any).setEnabled(true);
    this.$rootScope.$broadcast('WorkflowEditor.EDITOR_MODE_SET');
  }

  private _unbindEditorListeners(): void {
    this._editableModeEventListeners.forEach((func) => func && func());
    this._editableModeEventListeners = [];
  }

  updateAndRerenderEdges(data: any): void {
    (this.workflowService as any).updateTypeKnowledge(data.knowledge);
    if (this.selectedNode) {
      (this.graphNodesService as any).getNodeParameters(this.selectedNode);
    }
  }

  loadReportById(reportEntityId: any): void {
    if ((this.reportService as any).hasReportEntity(reportEntityId)) {
      (this.reportService as any).getReport(reportEntityId).then((report: any) => { this.report = report; });
    }
  }

  getWorkflow(): any {
    return (this.workflowService as any).getCurrentWorkflow();
  }

  getSelectedNode(): any {
    return this.selectedNode;
  }

  unselectNode(): void {
    if (this.selectedNode) {
      (this.multiSelectionService as any).removeNodeIdsFromSelection([this.selectedNode.id]);
      this.selectedNode = null;
    }
  }

  isEditable(): boolean {
    return (this.workflowService as any).isWorkflowEditable();
  }

  private _handleDelete(): void {
    if (!(this.workflowService as any).isWorkflowEditable()) { return; }
    const selectedNodeIds = (this.multiSelectionService as any).getSelectedNodeIds();
    const sinkOrSourceNodeIds = _.filter(selectedNodeIds, (nodeId: any) => {
      const node = this.getWorkflow().getNodeById(nodeId);
      return (this.graphNodesService as any).isSinkOrSource(node);
    });
    if (sinkOrSourceNodeIds.length > 0) {
      const msg = 'Cannot delete source nor sink nodes';
      (this.notificationService as any).showError({ title: 'Illegal node deletion', message: msg }, msg);
    }
    const nodeIdsToBeRemoved = _.difference(selectedNodeIds, sinkOrSourceNodeIds);
    this.getWorkflow().removeNodes(nodeIdsToBeRemoved);
    (this.multiSelectionService as any).clearSelection();
    this.unselectNode();
    this.selectedPortObject = null;
    this.adapterService.removeNodes(nodeIdsToBeRemoved);
  }
}
