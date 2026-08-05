/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Injectable } from '@angular/core';
import jsPlumb from 'jsplumb';
import * as _ from 'lodash';
import { OperationsHierarchyService } from './operations-hierarchy.service';
import { OperationsService } from './operations.service';

// Phase C / AngularJS removal (engine cluster): native port of editor/core-canvas/graph-node/
// graph-style.service.js. Computes jsPlumb port endpoint/paint styles from operation type qualifiers +
// the port-highlighting-on-drag logic. Its deps (OperationsHierarchyService/OperationsService) are already
// Angular. Consumed by BOTH the ng2 graph-node component (getOutputTypeFromQualifier, via the
// 'GraphStyleService' string token aliased in bootstrap.ts) AND the still-AngularJS canvas adapter
// (getStyleForPort/enable-disablePortHighlighting), so it is also downgraded back to AngularJS as
// 'GraphStyleService' in bootstrap.ts — a shared service straddling both frameworks during the migration.

const ESTIMATOR = ['ai.deepsense.deeplang.doperables.Estimator'];
const TRANSFORMER = ['ai.deepsense.deeplang.doperables.Transformer'];
const EVALUATOR = ['ai.deepsense.deeplang.doperables.Evaluator'];
const DATAFRAME = ['ai.deepsense.deeplang.doperables.dataframe.DataFrame'];

const DOT_ENDPOINT = 'Dot';
const RECTANGLE_ENDPOINT = 'Rectangle';

const ESTIMATOR_COLOR = '#62b77a';
const DEFAULT_COLOR = '#0197c8';
const TRANSFORMER_COLOR = '#021f4e';
const EVALUATOR_COLOR = '#afaf3c';
const READ_ONLY_COLOR = '#076575';

const DEFAULT_PAINT_STYLE = { fill: DEFAULT_COLOR };

const STYLES_MAP: { [k: string]: any } = {
  estimator: { stroke: 'transparent', strokeWidth: 5, fill: ESTIMATOR_COLOR },
  transformer: { stroke: 'transparent', strokeWidth: 5, fill: TRANSFORMER_COLOR },
  evaluator: { stroke: 'transparent', strokeWidth: 5, fill: EVALUATOR_COLOR },
  dataframe: { stroke: 'transparent', strokeWidth: 3, fill: DEFAULT_COLOR },
  readonly: { stroke: 'transparent', strokeWidth: 3, fill: READ_ONLY_COLOR }
};

const CONNECTOR_STYLE_DEFAULT = { strokeWidth: 2 };
const CONNECTOR_HOVER_STYLE = { endpoint: 'Dot', stroke: DEFAULT_COLOR };

const OUTPUT_STYLE: any = {
  endpoint: DOT_ENDPOINT,
  isSource: true,
  connector: ['Bezier', { curviness: 75 }],
  connectorStyle: CONNECTOR_STYLE_DEFAULT,
  connectorHoverStyle: CONNECTOR_HOVER_STYLE,
  maxConnections: -1,
  paintStyle: DEFAULT_PAINT_STYLE
};

const INPUT_STYLE: any = {
  endpoint: RECTANGLE_ENDPOINT,
  dropOptions: { hoverClass: 'hover', activeClass: 'active' },
  isTarget: true,
  maxConnections: 1,
  paintStyle: DEFAULT_PAINT_STYLE
};

@Injectable({ providedIn: 'root' })
export class GraphStyleService {
  constructor(
    private OperationsHierarchyService: OperationsHierarchyService,
    private Operations: OperationsService
  ) {}

  getStyleForPort(port: any): any {
    let portStyle: any = {};
    if (port.type === 'input') {
      portStyle = Object.create(INPUT_STYLE);
    } else {
      portStyle = Object.create(OUTPUT_STYLE);
      const isSource = this.canPortBeSource(port);
      const color = isSource ? this.getPortPaintStyleForQualifier(port.typeQualifier[0]).fill : READ_ONLY_COLOR;
      const connectorStyle = Object.assign({}, CONNECTOR_STYLE_DEFAULT, { stroke: color });
      const connectorHoverStyle = Object.assign({}, CONNECTOR_STYLE_DEFAULT, { stroke: color });
      portStyle.isSource = isSource;
      portStyle.connectorStyle = connectorStyle;
      portStyle.connectorHoverStyle = connectorHoverStyle;
    }
    if (port.typeQualifier.length === 1) {
      portStyle.endpoint = this.getPortEndingTypeForQualifier(port.typeQualifier[0]);
      portStyle.paintStyle = this.getPortPaintStyleForQualifier(port.typeQualifier[0]);
    }
    return portStyle;
  }

  canPortBeSource(port: any): boolean {
    const catalog = this.Operations.getCatalog();
    const filter = this.Operations.getFilterForTypeQualifier(port.typeQualifier);
    const categories = this.Operations.filterCatalog(catalog, filter as any);
    return categories.length > 0;
  }

  getPortEndingTypeForQualifier(typeQualifier: string): string {
    const type = this.getOutputTypeFromQualifier(typeQualifier);
    return (type === 'dataframe' || type === 'readonly') ? DOT_ENDPOINT : RECTANGLE_ENDPOINT;
  }

  getPortPaintStyleForQualifier(typeQualifier: string): any {
    return STYLES_MAP[this.getOutputTypeFromQualifier(typeQualifier)];
  }

  getOutputTypeFromQualifier(typeQualifier: string): string {
    if (this.OperationsHierarchyService.IsDescendantOf(typeQualifier, ESTIMATOR)) { return 'estimator'; }
    if (this.OperationsHierarchyService.IsDescendantOf(typeQualifier, TRANSFORMER)) { return 'transformer'; }
    if (this.OperationsHierarchyService.IsDescendantOf(typeQualifier, EVALUATOR)) { return 'evaluator'; }
    if (this.OperationsHierarchyService.IsDescendantOf(typeQualifier, DATAFRAME)) { return 'dataframe'; }
    return 'readonly';
  }

  // TODO this method will need refactor because some of its logic is repeated in controller
  enablePortHighlighting(nodes: any, sourceEndpoint: any): void {
    const sourceNodeId = sourceEndpoint.getParameter('nodeId');
    const sourcePortIndex = sourceEndpoint.getParameter('portIndex');
    const sourcePort = nodes[sourceNodeId].output[sourcePortIndex];

    const endpointTargets =
      _.chain(nodes)
        .values()
        .map((node: any) => ({
          nodeInput: node.input,
          nodeEndpoints: (jsPlumb as any).getEndpoints(this.getNodeElementById(node.id))
            .filter((endpoint: any) => endpoint.isTarget)
        }))
        .map((nodesInfo: any) => {
          const { nodeInput, nodeEndpoints } = nodesInfo;
          return nodeEndpoints.map((endpoint: any) => {
            const portIndex = endpoint.getParameter('portIndex');
            return { endpoint, port: nodeInput[portIndex] };
          });
        })
        .flatMap()
        .filter((endpointInfo: any) => {
          const { port, endpoint } = endpointInfo;
          const typesMatch = sourcePort.typeQualifier
            .some((typeQualifier: string) => this.OperationsHierarchyService.IsDescendantOf(typeQualifier, port.typeQualifier));
          return typesMatch && endpoint.connections.length === 0 && port.nodeId !== sourceNodeId;
        })
        .map((endpointInfo: any) => endpointInfo.endpoint)
        .value();

    endpointTargets.forEach((endpoint: any) => { endpoint.addClass('matching-port'); });
  }

  disablePortHighlighting(nodes: any): void {
    const endpointTargets = _.chain(nodes)
      .map((node: any) => (jsPlumb as any).getEndpoints(this.getNodeElementById(node.id)))
      .values()
      .flatMap()
      .value();
    endpointTargets.forEach((endpoint: any) => { endpoint.removeClass('matching-port'); });
  }

  getNodeElementById(id: string): any {
    return document.querySelector(`#node-${id}`);
  }
}
