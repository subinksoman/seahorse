/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Injectable } from '@angular/core';
import { UUIDGenerator } from './uuid-generator.service';

// Phase C-1: migrated from workflows/inner-workflows/default-inner-workflow-generator.service.js.
// Builds the default source->sink inner workflow for custom transformers. Injects the already-migrated
// Angular UUIDGenerator DIRECTLY as a class (bottom-up win). Public surface (create) unchanged;
// downgraded as 'DefaultInnerWorkflowGenerator'.
@Injectable({ providedIn: 'root' })
export class DefaultInnerWorkflowGenerator {
  constructor(private UUIDGenerator: UUIDGenerator) {}

  create(): any {
    const sourceId = this.UUIDGenerator.generateUUID();
    const sinkId = this.UUIDGenerator.generateUUID();
    return {
      id: this.UUIDGenerator.generateUUID(),
      workflow: {
        nodes: [{
          id: sourceId,
          operation: {
            id: 'f94b04d7-ec34-42f7-8100-93fe235c89f8',
            name: 'Source'
          },
          parameters: {}
        }, {
          id: sinkId,
          operation: {
            id: 'e652238f-7415-4da6-95c6-ee33808561b2',
            name: 'Sink'
          },
          parameters: {}
        }],
        connections: [{
          from: {
            nodeId: sourceId,
            portIndex: 0
          },
          to: {
            nodeId: sinkId,
            portIndex: 0
          }
        }]
      },
      publicParams: [],
      thirdPartyData: {
        gui: {
          name: 'Inner workflow of custom transformer',
          nodes: {
            [sourceId]: {
              uiName: '',
              color: '#2F4050',
              coordinates: { x: 5233, y: 4951 }
            },
            [sinkId]: {
              uiName: '',
              color: '#2F4050',
              coordinates: { x: 5236, y: 5247 }
            }
          }
        }
      },
      variables: {}
    };
  }
}
