/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Injectable, Inject } from '@angular/core';
import * as _ from 'lodash';
import { specialOperations } from '../../enums/special-operations.js';
import { sessionStatus } from '../../enums/session-status.js';
import { OperationsHierarchyService } from './operations-hierarchy.service';
import { WorkflowsApiClient } from '../api/workflows-api-client.service';
import { OperationsService } from './operations.service';
import { ConfirmationModalService } from './confirmation-modal.service';
import { DefaultInnerWorkflowGenerator } from './default-inner-workflow-generator.service';
import { SessionManagerApi } from '../api/session-manager-api.service';
import { SessionManager } from './session-manager.service';
import { UserService } from './user.service';
import { CycleAnalyserService } from './cycle-analyser.service';

const INNER_WORKFLOW_PARAM_NAME = 'inner workflow';

// Phase C-1: migrated from workflows/workflows.service.js — THE central editor service (workflow
// stack, (de)serialization, save-on-change debounce, session lifecycle, inner workflows, cluster,
// connection validity). The legacy factory already wrapped a `class WorkflowServiceClass`; here it
// becomes the @Injectable directly, injecting the migrated Angular services as classes and @Inject-ing
// the still-AngularJS deps by bridged token (Workflow + DeepsenseCycleAnalyser [deepsense-*] and the
// 3rd-party debounce). Every factory-closure reference is now `this.`. Public surface unchanged;
// downgraded as 'WorkflowService' for its 15 AngularJS consumers.
@Injectable({ providedIn: 'root' })
export class WorkflowService {
  private _workflowsStack: any[] = [];
  private _innerWorkflowByNodeId: { [nodeId: string]: any } = {};
  private _workflowsData: any;
  private _saveWorkflow: (newSerialized: any, oldSerialized: any) => void;

  constructor(
    @Inject('$rootScope') private $rootScope: any,
    @Inject('Workflow') private Workflow: any,
    private operationsHierarchyService: OperationsHierarchyService,
    private workflowsApiClient: WorkflowsApiClient,
    private operations: OperationsService,
    private confirmationModalService: ConfirmationModalService,
    private defaultInnerWorkflowGenerator: DefaultInnerWorkflowGenerator,
    private sessionManagerApi: SessionManagerApi,
    private sessionManager: SessionManager,
    @Inject('ServerCommunication') private serverCommunication: any,
    private userService: UserService,
    private cycleAnalyser: CycleAnalyserService
  ) {
    // Save workflow after all intermediate changes are resolved. Intermediate state might be invalid.
    // Debounce takes care of that and additionally reduces unnecessary client-server communication.
    this._saveWorkflow = _.debounce((newSerializedWorkflow: any, oldSerializedWorkflow: any) => {
      if (newSerializedWorkflow !== oldSerializedWorkflow) {
        console.log('Saving workflow after change...', newSerializedWorkflow);
        this.workflowsApiClient.updateWorkflow(newSerializedWorkflow);
      }
    }, 200);
    // All rootScope listeners must go to initRootWorkflow method.
    // Otherwise those would get lost upon cloning workflow.
  }

  initRootWorkflow(workflowData: any): void {
    this._workflowsStack = [];
    const workflow = this._deserializeWorkflow(workflowData);
    workflow.workflowType = 'root';
    workflow.workflowStatus = 'editor';
    workflow.sessionStatus = sessionStatus.NOT_RUNNING;

    workflow.owner = {
      id: workflowData.workflowInfo.ownerId,
      name: workflowData.workflowInfo.ownerName
    };

    this._initializeAllInnerWorkflows(workflow, workflow);

    this.$rootScope.$watch(() => workflow.serialize(), this._saveWorkflow, true);
    this.$rootScope.$watch(() => this.sessionManager.statusForWorkflowId(workflow.id), (newStatus: any) => {
      workflow.sessionStatus = newStatus;
    });

    this.$rootScope.$on('StatusBar.START_EDITING', () => {
      const workflow = this.getRootWorkflow();
      this.sessionManagerApi.startSession({
        workflowId: workflow.id,
        cluster: workflow.cluster
      });
    });

    this.$rootScope.$on('StatusBar.STOP_EDITING', (event: any, force = false) => {
      if (force) {
        this.stopEditing();
      } else {
        this.confirmationModalService.showModal({
          message: 'Are you sure you want to stop executor? Cached results will disappear.'
        }).then((confirmed: boolean) => { if (confirmed) { this.stopEditing(); } });
      }
    });

    this.$rootScope.$on('AttributesPanel.OPEN_INNER_WORKFLOW', (event: any, data: any) => {
      const workflow = this._innerWorkflowByNodeId[data.nodeId];
      this._workflowsStack.push(workflow);
    });

    this.$rootScope.$on('StatusBar.CLOSE-INNER-WORKFLOW', () => {
      this._workflowsStack.pop();
    });

    this._watchForNewCustomTransformers(workflow, workflow);
    this._workflowsStack.push(workflow);
    this.fetchCluster();

    const unregisterSynchronization = this.$rootScope.$on('ServerCommunication.MESSAGE.heartbeat', (event: any, data: any) => {
      if (data.workflowId === workflow.id) {
        console.log('Received first hearbeat. Synchronizing with executor...');
        this.serverCommunication.sendSynchronize();
        unregisterSynchronization();
      }
    });
  }

  // TODO Add enums for workflowType, workflowStatus
  initInnerWorkflow(node: any, rootWorkflow: any): void {
    const innerWorkflowData = node.parametersValues[INNER_WORKFLOW_PARAM_NAME];
    const innerWorkflow = this._deserializeInnerWorkflow(innerWorkflowData);
    innerWorkflow.workflowType = 'inner';
    innerWorkflow.workflowStatus = 'editor';
    innerWorkflow.sessionStatus = sessionStatus.NOT_RUNNING;
    innerWorkflow.owner = rootWorkflow.owner;

    innerWorkflow.publicParams = innerWorkflow.publicParams || [];
    this._innerWorkflowByNodeId[node.id] = innerWorkflow;

    this.$rootScope.$watch(() => this.sessionManager.statusForWorkflowId(rootWorkflow.id), (newStatus: any) => {
      innerWorkflow.sessionStatus = newStatus;
    });

    this.$rootScope.$watch(() => this._serializeInnerWorkflow(innerWorkflow), (newVal: any) => {
      node.parametersValues = node.parametersValues || {};
      node.parametersValues[INNER_WORKFLOW_PARAM_NAME] = newVal;
    }, true);

    this._watchForNewCustomTransformers(innerWorkflow, rootWorkflow);
    this._initializeAllInnerWorkflows(innerWorkflow, rootWorkflow);
  }

  private _initializeAllInnerWorkflows(workflow: any, rootWorkflow: any): void {
    const nodes = _.values(workflow.getNodes());
    nodes.filter((n: any) => n.operationId === specialOperations.CUSTOM_TRANSFORMER.NODE)
      .forEach((node: any) => this.initInnerWorkflow(node, rootWorkflow));
  }

  private _watchForNewCustomTransformers(workflow: any, rootWorkflow: any): void {
    this.$rootScope.$watchCollection(() => workflow.getNodes(), (newNodes: any, oldNodes: any) => {
      const addedNodeIds = _.difference(_.keys(newNodes), _.keys(oldNodes));
      const addedNodes = _.map(addedNodeIds, (nodeId) => newNodes[nodeId]);
      const addedCustomWorkflowNodes = _.filter(addedNodes,
        (n: any) => n.operationId === specialOperations.CUSTOM_TRANSFORMER.NODE
      );
      _.forEach(addedCustomWorkflowNodes, (addedNode: any) => {
        if (_.isUndefined(addedNode.parametersValues[INNER_WORKFLOW_PARAM_NAME])) {
          addedNode.parametersValues[INNER_WORKFLOW_PARAM_NAME] = this.defaultInnerWorkflowGenerator.create();
        }
        this.initInnerWorkflow(addedNode, rootWorkflow);
      });
    });
  }

  private _getRootWorkflowsWithInnerWorkflows(): any[] {
    const innerWorkflows = _.values(this._innerWorkflowByNodeId);
    return [this.getRootWorkflow()].concat(innerWorkflows);
  }

  private _serializeInnerWorkflow(workflow: any): any {
    const workflowData = workflow.serialize();
    workflowData.publicParams = workflow.publicParams;
    return workflowData;
  }

  private _deserializeInnerWorkflow(workflowData: any): any {
    const workflow = this._deserializeWorkflow(workflowData);
    workflow.publicParams = workflowData.publicParams || [];
    return workflow;
  }

  private _deserializeWorkflow(workflowData: any): any {
    const operations = this.operations.getData();
    const workflow = new this.Workflow();
    const thirdPartyData = workflowData.thirdPartyData || {};
    workflow.id = workflowData.id;
    workflow.name = (thirdPartyData.gui || {}).name;
    workflow.description = (thirdPartyData.gui || {}).description;
    workflow.createNodes(workflowData.workflow.nodes, operations, workflowData.thirdPartyData);
    workflow.createEdges(workflowData.workflow.connections);
    workflow.updateEdgesStates(this.operationsHierarchyService);
    return workflow;
  }

  isWorkflowEditable(): boolean {
    const workflow = this.getCurrentWorkflow();
    return workflow.workflowStatus === 'editor' &&
      workflow.sessionStatus === sessionStatus.RUNNING &&
      this.isCurrentUserOwnerOfCurrentWorkflow();
  }

  isWorkflowRunning(): boolean {
    const statuses = _.chain(this.getCurrentWorkflow().getNodes())
      .map((node: any) => {
        return node.state && node.state.status;
      })
      .value();
    const idx = _.findIndex(statuses, (status: any) => {
      return status === 'status_queued' || status === 'status_running';
    });

    return idx !== -1;
  }

  isExecutorForCurrentWorkflowRunning(): boolean {
    const status = this.getCurrentWorkflow().sessionStatus;
    return status === sessionStatus.RUNNING || status === sessionStatus.CREATING;
  }

  getCurrentWorkflow(): any {
    return _.last(this._workflowsStack);
  }

  onInferredState(states: any): void {
    this._getRootWorkflowsWithInnerWorkflows().forEach((w: any) => w.updateState(states));
  }

  clearGraph(): void {
    this.getCurrentWorkflow().clearGraph();
  }

  updateTypeKnowledge(knowledge: any): void {
    this._getRootWorkflowsWithInnerWorkflows().forEach((w: any) => w.updateTypeKnowledge(knowledge));
  }

  updateEdgesStates(): void {
    this.getCurrentWorkflow().updateEdgesStates(this.operationsHierarchyService);
  }

  getRootWorkflow(): any {
    return this._workflowsStack[0];
  }

  getAllWorkflows(): any {
    return this._workflowsData;
  }

  removeWorkflowFromList(workflowId: string): void {
    const foundWorkflow = this._workflowsData.find((workflow: any) => workflow.id === workflowId);
    const workflowIndex = this._workflowsData.indexOf(foundWorkflow);
    if (workflowIndex >= 0) {
      this._workflowsData.splice(workflowIndex, 1);
    }
  }

  deleteWorkflow(workflowId: string): void {
    this.workflowsApiClient.deleteWorkflow(workflowId).then(() => {
      this.removeWorkflowFromList(workflowId);
    });
  }

  downloadWorkflow(workflowId: string): any {
    return this.workflowsApiClient.getWorkflow(workflowId);
  }

  downloadWorkflows(): any {
    return this.workflowsApiClient.getAllWorkflows().then((workflows: any) => {
      this._workflowsData = workflows; // TODO There should be no state here. Get rid of it
      return workflows;
    });
  }

  stopEditing(): void {
    const workflow = this.getRootWorkflow();
    this.sessionManagerApi.deleteSessionById(workflow.id);
  }

  bindPresetToCurrentWorkflow(presetId: string): any {
    const rootWorkflow = this.getRootWorkflow();
    return this.workflowsApiClient.bindPresetToWorkflow(presetId, rootWorkflow.id)
      .then(() => this.fetchCluster());
  }

  fetchCluster(workflow?: any): any {
    workflow = workflow || this.getRootWorkflow();

    if (workflow) {
      return this.workflowsApiClient.getPresetByWorkflowId(workflow.id)
        .then((result: any) => {
          workflow.cluster = result;
        })
        .catch((error: any) => {
          console.error('Cluster information is not available for workflow!', error);
        });
    } else {
      return false;
    }
  }

  canAddNewConnection(connection: any): boolean {
    return !this.doesCycleExist() && this.isConnectionValid(connection);
  }

  doesCycleExist(): boolean {
    const workflow = this.getCurrentWorkflow();
    return this.cycleAnalyser.cycleExists(workflow);
  }

  isConnectionValid(connection: any): boolean {
    const workflow = this.getCurrentWorkflow();

    const startNode = workflow.getNodeById(connection.startNodeId);
    const startNodeTypeQualifier = startNode.originalOutput[connection.startPortId].typeQualifier[0];

    const endNode = workflow.getNodeById(connection.endNodeId);
    const endNodeTypeQualifier = endNode.input[connection.endPortId].typeQualifier[0];

    return this.operationsHierarchyService.IsDescendantOf(startNodeTypeQualifier, [endNodeTypeQualifier]);
  }

  isCurrentUserOwnerOfCurrentWorkflow(): boolean {
    const workflow = this.getCurrentWorkflow();
    return workflow.owner.id === this.userService.getSeahorseUser().id;
  }
}
