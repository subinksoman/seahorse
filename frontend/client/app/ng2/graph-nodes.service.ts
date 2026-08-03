/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Injectable, Inject } from '@angular/core';
import * as _ from 'lodash';
import { specialOperations } from '../enums/special-operations.js';
import { OperationsService } from './operations.service';
import { UUIDGenerator } from './uuid-generator.service';
import { WorkflowsApiClient } from './workflows-api-client.service';
import { NotificationService } from './notification.service';

declare const angular: any; // global (expose-loader) — angular.merge/copy/extend

// Phase C-1: migrated from workflows/workflows-editor/graph-nodes.service.js. Creates/clones graph
// nodes (incl. deep inner-workflow id remapping and notebook-node clone) and resolves node parameters.
// Injects the Angular Operations/UUIDGenerator/WorkflowsApiClient directly; $q/$rootScope/$log +
// the still-AngularJS DeepsenseNodeParameters (deepsense-*) are bridged. NOTE: the legacy code called
// this.NotificationService.showError in the notebook-clone failure path but never injected it (a
// latent bug — it would have thrown); NotificationService (Angular) is now injected so that path works.
// Public surface unchanged; downgraded as 'GraphNodesService'.
@Injectable({ providedIn: 'root' })
export class GraphNodesService {
  constructor(
    @Inject('$q') private $q: any,
    @Inject('$rootScope') private $rootScope: any,
    @Inject('$log') private $log: any,
    @Inject('DeepsenseNodeParameters') private DeepsenseNodeParameters: any,
    private Operations: OperationsService,
    private UUIDGenerator: UUIDGenerator,
    private WorkflowsApiClient: WorkflowsApiClient,
    private NotificationService: NotificationService
  ) {}

  getNodeParameters(node: any): any {
    const deferred = this.$q.defer();

    if (node.hasParameters()) {
      node.refreshParameters(this.DeepsenseNodeParameters);
      deferred.resolve(node, 'sync');
    } else {
      this.Operations.getWithParams(node.operationId)
        .then((operationData: any) => {
          this.$rootScope.$applyAsync(() => {
            node.setParameters(operationData.parameters, this.DeepsenseNodeParameters);
            deferred.resolve(node, 'async');
          });
        }, (error: any) => {
          this.$log.error('operation fetch error', error);
          deferred.reject(error);
        });
    }
    return deferred.promise;
  }

  createNodeAndAdd(workflow: any, params: any): any {
    params.id = this.UUIDGenerator.generateUUID();
    const node = workflow.createNode(params);
    workflow.addNode(node);
    return node;
  }

  cloneNodes(workflow: any, nodes: any[]): any[] {
    const cloningNodeIds = nodes.map((node) => node.id);
    const clones = _.map(nodes, (node) => this._cloneNode(workflow, node));

    // clone connections with saving hierarchy
    _.forEach(nodes, (node, index) => {
      this._setEdgeConnectionFromClone(node, clones, cloningNodeIds);
      workflow.cloneEdges(node, clones[index]);
    });
    return clones;
  }

  // TODO This (and cloneNodes) should probably be part of workflow class and added to project deepsense-graph-model
  private _cloneNode(workflow: any, node: any): any {
    const operation = this.Operations.get(node.operationId);
    const offset = { x: 255, y: 0 };
    const nodeClone = _.cloneDeep(node);
    const newNodeId = this.UUIDGenerator.generateUUID();
    const nodeParams = angular.merge(
      nodeClone, {
        id: newNodeId,
        operation: operation,
        x: node.x - offset.x >= 0 ? node.x - offset.x : node.x,
        y: node.y - offset.y >= 0 ? node.y - offset.y : node.y,
        uiName: nodeClone.uiName ? nodeClone.uiName += ' copy' : ''
      }
    );

    const createdNode = workflow.createNode(nodeParams);
    createdNode.parametersValues = angular.copy(node.parameters.serialize());

    if (Object.values(specialOperations.NOTEBOOKS).includes(node.operationId)) {
      this.WorkflowsApiClient.cloneNotebookNode(workflow.id, node.id, newNodeId).then(() => {
        return workflow.addNode(createdNode);
      }, () => {
        this.NotificationService.showError({
          title: 'Error',
          message: 'There was an error during copying content of the notebook! Content of the notebook is empty.'
        });
      });
    }

    if (node.hasInnerWorkflow()) {
      const oldInnerWorkflow = createdNode.getInnerWorkflow();
      const oldInnerThirdPartyData = createdNode.getInnerThirdPartyData();
      const map = this._mapOldIdsWithNewOnes(oldInnerWorkflow);
      const newInnerThirdPartyData = this._assingNewIdsThirdPartyData(map, oldInnerThirdPartyData);
      const newInnerWorkflow = this._assignNewIds(map, oldInnerWorkflow);
      createdNode.setInnerWorkflow(newInnerWorkflow);
      createdNode.setInnerThirdPartyData(newInnerThirdPartyData);
    }

    return workflow.addNode(createdNode);
  }

  private _mapOldIdsWithNewOnes(innerWorkflow: any): any {
    let map: any = {};
    innerWorkflow.nodes.forEach((node: any) => {
      if (node.operation.id === specialOperations.CUSTOM_TRANSFORMER.NODE) {
        const mapFromNestedNode = this._mapOldIdsWithNewOnes(node.parameters['inner workflow'].workflow);
        map = angular.extend(map, mapFromNestedNode);
      }
      map[node.id] = this.UUIDGenerator.generateUUID();
    });
    return map;
  }

  private _assignNewIds(map: any, innerWorkflow: any): any {
    const newInnerWorkflow = angular.copy(innerWorkflow);
    newInnerWorkflow.connections.forEach((connection: any) => {
      connection.from.nodeId = map[connection.from.nodeId];
      connection.to.nodeId = map[connection.to.nodeId];
    });
    newInnerWorkflow.nodes.forEach((node: any) => {
      const nestedInnerWorkflow = node.parameters['inner workflow'];
      if (nestedInnerWorkflow) {
        nestedInnerWorkflow.workflow = this._assignNewIds(map, nestedInnerWorkflow.workflow);
        nestedInnerWorkflow.thirdPartyData = this._assingNewIdsThirdPartyData(map, nestedInnerWorkflow.thirdPartyData);
      }
      node.id = map[node.id];
    });
    return newInnerWorkflow;
  }

  private _assingNewIdsThirdPartyData(map: any, thirdPartyData: any): any {
    const thirdPartyDataCopy = angular.copy(thirdPartyData);
    Object.keys(thirdPartyDataCopy.gui.nodes).forEach((oldId) => {
      thirdPartyDataCopy.gui.nodes[map[oldId]] = thirdPartyDataCopy.gui.nodes[oldId];
      delete thirdPartyDataCopy.gui.nodes[oldId];
    });
    return thirdPartyDataCopy;
  }

  private _setEdgeConnectionFromClone(node: any, clones: any[], cloningNodeIds: any[]): void {
    _.filter(node.edges, (edge: any) => edge.startNodeId !== node.id)
      .forEach((edge: any) => {
        const cloningNodeIndex = cloningNodeIds.indexOf(edge.startNodeId);
        if (cloningNodeIndex > -1) {
          edge.__connectFromClone = clones[cloningNodeIndex].id;
        }
      });
  }

  isSinkOrSource(node: any): boolean {
    return node.operationId === specialOperations.CUSTOM_TRANSFORMER.SINK ||
      node.operationId === specialOperations.CUSTOM_TRANSFORMER.SOURCE;
  }
}
