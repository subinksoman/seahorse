/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Injectable, Inject } from '@angular/core';
import * as _ from 'lodash';
import { MultiSelectionService } from './multi-selection.service';
import { WorkflowService } from './workflow.service';
import { GraphNodesService } from './graph-nodes.service';

declare const $: any; // jQuery global (expose-loader)

// Phase C-1: migrated from workflows/workflows-editor/node-copy-paste-visitor.js. The clipboard
// copy/paste strategy for graph nodes. Injects the Angular MultiSelectionService + WorkflowService
// directly; $q/$rootScope and the still-AngularJS GraphNodesService/CanvasService are bridged. Public
// surface unchanged; downgraded as 'NodeCopyPasteVisitorService'.
@Injectable({ providedIn: 'root' })
export class NodeCopyPasteVisitorService {
  constructor(
    @Inject('$q') private $q: any,
    @Inject('$rootScope') private $rootScope: any,
    private multiSelectionService: MultiSelectionService,
    private workflowService: WorkflowService,
    private graphNodesService: GraphNodesService,
    @Inject('CanvasService') private canvasService: any
  ) {}

  getType(): string {
    return 'nodes';
  }

  isThereAnythingToCopy(): boolean {
    return this.multiSelectionService.getSelectedNodeIds().length > 0;
  }

  getSerializedDataToCopy(): string {
    const nodeIds = this.multiSelectionService.getSelectedNodeIds();
    return nodeIds.join();
  }

  isFocused(): boolean {
    return $('.canvas').is(':focus');
  }

  pasteUsingSerializedData(serializedData: string): void {
    const nodeIds = serializedData.split(',');
    const workflow = this.workflowService.getCurrentWorkflow();
    const nodes = nodeIds.map(workflow.getNodeById);

    const nodeParametersPromises = _.map(nodes, (node) => {
      return this.graphNodesService.getNodeParameters(node);
    });

    this.$q.all(nodeParametersPromises).then(
      (nodes: any) => {
        const legalNodesToPaste = _.filter(nodes, (n: any) => !this.graphNodesService.isSinkOrSource(n));
        return this.graphNodesService.cloneNodes(workflow, legalNodesToPaste);
      }
    )
      .then((clonedNodes: any) => {
        // mark clones as selected after they are created
        this.$rootScope.$applyAsync(() => {
          const nodesId = clonedNodes.map((node: any) => node.id);
          this.multiSelectionService.clearSelection();
          this.$rootScope.$broadcast('MultiSelection.ADD', nodesId);
          this.canvasService.render();
          this.canvasService.fit();
        });
      });
  }
}
