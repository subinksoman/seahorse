/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Injectable } from '@angular/core';
import * as _ from 'lodash';

// Phase C / AngularJS removal: native port of the deepsense.cycle-analyser 'DeepsenseCycleAnalyser'
// factory (common/deepsense-components/deepsense-cycle-analyser). Pure graph logic — a colour-marking
// DFS that reports whether the workflow graph contains a cycle. Operates entirely on the passed-in
// graph object's getNodesIds()/getNeightbours(id) contract (unchanged), so no deepsense-graph-model
// dependency of its own. Injected directly by WorkflowService (was the bridged token).
@Injectable({ providedIn: 'root' })
export class CycleAnalyserService {
  cycleExists(experiment: any): boolean {
    const COLOUR = { WHITE: 'white', GREY: 'grey', BLACK: 'black' };
    const colour: { [id: string]: string } = {};
    const stack: any[] = [];
    const nodesIds = experiment.getNodesIds();
    let cycleDetected = false;

    const dfs = (): void => {
      while (stack.length > 0) {
        const currNodeId = _.last(stack);
        switch (colour[currNodeId]) {
          case COLOUR.WHITE: {
            colour[currNodeId] = COLOUR.GREY;
            const neighbourNodesIds = experiment.getNeightbours(currNodeId);
            for (let i = 0; i < neighbourNodesIds.length; i++) {
              const neighNodeId = neighbourNodesIds[i];
              if (colour[neighNodeId] === COLOUR.GREY) {
                cycleDetected = true;
              }
              stack.push(neighNodeId);
            }
            break;
          }
          case COLOUR.GREY:
            colour[currNodeId] = COLOUR.BLACK;
            stack.pop();
            break;
          case COLOUR.BLACK:
            stack.pop();
            break;
          // no default
        }
      }
    };

    _.forEach(nodesIds, (nodeId: any) => { colour[nodeId] = COLOUR.WHITE; });
    _.forEach(nodesIds, (nodeId: any) => {
      if (colour[nodeId] === COLOUR.WHITE && !cycleDetected) {
        stack.push(nodeId);
        dfs();
      }
    });

    return cycleDetected;
  }
}
