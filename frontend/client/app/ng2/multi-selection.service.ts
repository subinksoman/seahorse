/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Injectable, Inject } from '@angular/core';
import * as _ from 'lodash';

// Phase C-1: migrated from workflows/graph-panel/multi-selection/multi-selection.service.js. Tracks
// the set of selected graph-node ids, cleared on ui-router view reloads ($viewContentLoading, from
// the bridged $rootScope). The legacy module-scoped `selectedNodes` becomes an instance field — the
// service is a root singleton, so semantics are identical. Downgraded as 'MultiSelectionService'.
@Injectable({ providedIn: 'root' })
export class MultiSelectionService {
  private selectedNodes: string[] = [];

  constructor(@Inject('$rootScope') $rootScope: any) {
    $rootScope.$on('$viewContentLoading', () => {
      this.clearSelection();
    });
  }

  addNodeIdsToSelection(nodeIds: string[]): void {
    this.selectedNodes = _.union(this.selectedNodes, nodeIds);
  }

  isAlreadyAddedToSelection(node: { id: string }): boolean {
    return this.getSelectedNodeIds().indexOf(node.id) > -1;
  }

  clearSelection(): void {
    this.selectedNodes = [];
  }

  removeNodeIdsFromSelection(nodeIds: string[]): void {
    this.selectedNodes = _.difference(this.selectedNodes, nodeIds);
  }

  setSelectedNodeIds(nodeIds: string[]): void {
    this.selectedNodes = nodeIds;
  }

  getSelectedNodeIds(): string[] {
    return this.selectedNodes;
  }
}
