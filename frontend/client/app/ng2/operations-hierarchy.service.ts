/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Injectable, Inject } from '@angular/core';
import * as _ from 'lodash';
import { OperationsApiClient } from './operations-api-client.service';

// Phase C-1: migrated from common/api-clients/operations-hierarchy.service.js. Loads the operation
// type hierarchy from the (now Angular) OperationsApiClient and answers IsDescendantOf via BFS over a
// trait/class graph. $q is bridged. Public surface (load, IsDescendantOf) unchanged; downgraded as
// 'OperationsHierarchyService'. A direct WorkflowService dep — migrating it shrinks WorkflowService's
// future bridge surface.

// Plain helper (not an Angular service): the trait/class ancestry graph.
class Graph {
  nodes: { [node: string]: { [parent: string]: boolean } } = {};

  build(data: any): void {
    const that = this;
    const internal: any = {};

    _.assign(internal, {
      addNode: (node: string) => {
        that.nodes[node] = that.nodes[node] || {};
      },
      addParent: (node: string, parent: string) => {
        internal.addNode(node);
        that.nodes[node][parent] = true;
      },
      addParents: (node: string, parents: string[]) => {
        _.forEach(parents, (parent: string) => {
          internal.addParent(node, parent);
        });
      },
      addTraits: (traits: any[]) => {
        _.forEach(traits, (trait: any) => {
          const node = trait.name;
          internal.addNode(node);
          internal.addParents(node, trait.parents);
        });
      },
      addClasses: (classes: any[]) => {
        _.forEach(classes, (classIns: any) => {
          const node = classIns.name;
          internal.addNode(node);
          internal.addParents(node, classIns.traits);
          if (classIns.parent) {
            internal.addParent(node, classIns.parent);
          }
        });
      }
    });

    internal.addTraits(data.traits);
    internal.addClasses(data.classes);
  }

  IsDescendantOf(node: string, ancestors: string[]): boolean {
    const thatGraph = this;
    const visitedNodes: { [node: string]: boolean } = {};
    const queue = [node];

    /* run BFS */
    while (queue.length > 0) {
      const currNode = queue.shift() as string;
      const parents = _.map(thatGraph.nodes[currNode], (_value, parent) => parent);

      if (!visitedNodes[currNode]) {
        visitedNodes[currNode] = true;
        Array.prototype.push.apply(queue, parents);
      }
    }

    return _.every(_.map(ancestors, (ancestor) => visitedNodes[ancestor]));
  }
}

@Injectable({ providedIn: 'root' })
export class OperationsHierarchyService {
  private graph = new Graph();
  private isLoaded = false;

  constructor(
    @Inject('$q') private $q: any,
    private operationsApiClient: OperationsApiClient
  ) {
    // The legacy factory exposed closure functions (no `this`), so callers pass these detached —
    // e.g. `Operations.load().then(OperationsHierarchyService.load)`. Bind so detached calls keep
    // their instance context.
    this.load = this.load.bind(this);
    this.IsDescendantOf = this.IsDescendantOf.bind(this);
  }

  load(): any {
    if (this.isLoaded) {
      const deferred = this.$q.defer();
      deferred.resolve();
      return deferred.promise;
    } else {
      return this.operationsApiClient
        .getHierarchy()
        .then((data: any) => {
          this.graph.build(data);
          this.isLoaded = true;
        });
    }
  }

  IsDescendantOf(node: string, ancestors: string[]): boolean {
    return this.graph.IsDescendantOf(node, ancestors);
  }
}
