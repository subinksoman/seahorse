/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Injectable } from '@angular/core';
import jsPlumb from 'jsplumb';
import { WorkflowService } from './workflow.service';
import { GraphStyleService } from './graph-style.service';
import { ReportService } from './report.service';

declare const $: any; // jQuery (global)

// Phase C / AngularJS removal (engine cluster): native port of editor/core-canvas/adapter.service.js —
// the jsPlumb adapter (renders node ports + edges, binds connection/drag events, port hover/click). Deps
// (WorkflowService/GraphStyleService/ReportService[='Report']) are all Angular now. All AngularJS
// consumers are dead (canvas.component.js/editor.controller.js/canvas.service.js superseded by ng2), so
// it's isolatable — aliased to the class for the 4 ng2 consumers in bootstrap.ts (no downgrade). jsPlumb
// + jQuery ($) are globals. Logic ported verbatim.

const POSITION_MAP: any = {
  OUTPUT: { left: 'BottomLeft', center: 'BottomCenter', right: 'BottomRight' },
  INPUT: { left: [0.10, 0, 0, -1], center: 'TopCenter', right: [0.90, 0, 0, -1] }
};

const NEW_NODE_NODE: any = {
  id: 'new-node',
  input: [{ id: 'input-0-new-node', portPosition: 'center', index: 0 }],
  output: [],
  originalOutput: []
};

const NEW_NODE_EDGE: any = { id: 'new-node-edge', endNodeId: NEW_NODE_NODE.id, endPortId: 0 };

@Injectable({ providedIn: 'root' })
export class AdapterService {
  private selectedPortId: any = null;
  private container: any;
  private workflow: any;
  private edges: any;
  private nodes: any;
  private newNodeData: any;
  private isConnectionDragged = false;
  isEditable = false;
  onConnectionAbort: (arg: any) => void = () => {};
  onMouseOver: (...args: any[]) => void = () => {};
  onMouseOut: (...args: any[]) => void = () => {};
  onMouseClick: (...args: any[]) => void = () => {};

  constructor(
    private WorkflowService: WorkflowService,
    private GraphStyleService: GraphStyleService,
    private Report: ReportService
  ) {}

  initialize(container: any): void {
    this.container = container;
    this.reset();
  }

  bindEvents(): void {
    (jsPlumb as any).bind('connection', (jsPlumbEvent: any, originalEvent: any) => {
      this.stopDragging();
      if (!originalEvent) { return; }
      const data = {
        from: {
          nodeId: jsPlumbEvent.sourceId.slice('node-'.length),
          portIndex: jsPlumbEvent.sourceEndpoint.getParameter('portIndex')
        },
        to: {
          nodeId: jsPlumbEvent.targetId.slice('node-'.length),
          portIndex: jsPlumbEvent.targetEndpoint.getParameter('portIndex')
        }
      };
      const edge = this.workflow.createEdge(data);
      this.workflow.addEdge(edge);
      // TODO remove, as it shouldn't be here
      (this.WorkflowService as any).updateEdgesStates();
      jsPlumbEvent.connection.setParameter('edgeId', edge.id);
      if (!(this.WorkflowService as any).canAddNewConnection(edge)) {
        this.workflow.removeEdge(edge);
        (jsPlumb as any).detach(jsPlumbEvent.connection);
      }
    });

    (jsPlumb as any).bind('connectionDetached', (jsPlumbEvent: any, originalEvent: any) => {
      if (this.workflow) {
        const edge = this.workflow.getEdgeById(jsPlumbEvent.connection.getParameter('edgeId'));
        if (edge && jsPlumbEvent.targetEndpoint.isTarget && jsPlumbEvent.sourceEndpoint.isSource && originalEvent) {
          this.workflow.removeEdge(edge);
        }
      }
    });

    (jsPlumb as any).bind('connectionMoved', (jsPlumbEvent: any) => {
      const edge = this.workflow.getEdgeById(jsPlumbEvent.connection.getParameter('edgeId'));
      if (edge) { this.workflow.removeEdge(edge); }
    });

    (jsPlumb as any).bind('connectionDrag', (connection: any) => { this.startDragging(connection); });
    (jsPlumb as any).bind('connectionDragStop', () => { this.stopDragging(); });

    (jsPlumb as any).bind('connectionAborted', (connection: any, originalEvent: any) => {
      if ($(originalEvent.target).closest('core-canvas').length === 0 ||
          originalEvent.target.classList.contains('output')) {
        return;
      }
      this.onConnectionAbort({ newNodeData: {
        x: originalEvent.clientX,
        y: originalEvent.clientY,
        endpoint: connection.endpoints[0]
      } } as any);
    });
  }

  setZoom(zoom: number): void { (jsPlumb as any).setZoom(zoom); }

  setWorkflow(workflow: any): void {
    this.workflow = workflow;
    this.edges = workflow.getEdges();
    this.nodes = workflow.getNodes();
  }

  setNewNodeData(newNodeData: any): void { this.newNodeData = newNodeData; }
  setOnConnectionAbortFunction(fn: any): void { this.onConnectionAbort = fn; }
  setMouseOverOnPortFunction(fn: any): void { this.onMouseOver = fn; }
  setMouseOutOnPortFunction(fn: any): void { this.onMouseOut = fn; }
  setMouseClickOnPortFunction(fn: any): void { this.onMouseClick = fn; }

  reset(): void {
    (jsPlumb as any).deleteEveryEndpoint();
    (jsPlumb as any).unbind('connection');
    (jsPlumb as any).unbind('connectionDetached');
    (jsPlumb as any).unbind('connectionMoved');
    (jsPlumb as any).unbind('connectionDrag');
    (jsPlumb as any).unbind('connectionAborted');
    (jsPlumb as any).setContainer(this.container);
    this.bindEvents();
  }

  render(): void {
    this.reset();
    this.renderPorts(this.getNodesToRender(this.nodes));
    this.renderEdges(this.getEdgesToRender(this.edges));
    (jsPlumb as any).repaintEverything();
  }

  getNodesToRender(inputNodes: any): any {
    const nodes = Object.assign({}, inputNodes);
    if (this.newNodeData && this.newNodeData.nodeId) {
      const node = Object.assign({}, NEW_NODE_NODE);
      node.input[0].typeQualifier = [...this.newNodeData.typeQualifier];
      nodes[node.id] = node;
    }
    return nodes;
  }

  getEdgesToRender(inputEdges: any): any {
    const edges = Object.assign({}, inputEdges);
    if (this.newNodeData && this.newNodeData.nodeId) {
      const edge = Object.assign({}, NEW_NODE_EDGE);
      edge.startNodeId = this.newNodeData.nodeId;
      edge.startPortId = this.newNodeData.portIndex;
      edges[edge.id] = edge;
    }
    return edges;
  }

  renderPorts(nodes: any): void {
    for (const nodeId of Object.keys(nodes)) {
      const element = this.container.querySelector(`#node-${nodeId}`);
      const node = nodes[nodeId];
      this.renderOutputPorts(element, node.originalOutput, nodes[nodeId]);
      this.renderInputPorts(element, node.input);
    }
  }

  renderOutputPorts(element: any, ports: any[], node: any): void {
    ports.forEach((port: any) => {
      const reportEntityId = node.getResult(port.index);
      const hasReport = this.Report.hasReportEntity(reportEntityId);
      const style = this.GraphStyleService.getStyleForPort(port);

      const jsPlumbPort = (jsPlumb as any).addEndpoint(element, style, {
        anchor: POSITION_MAP.OUTPUT[port.portPosition],
        uuid: port.id
      });

      jsPlumbPort.bind('mouseover', (endpoint: any) => {
        this.onMouseOver(endpoint.canvas, port);
        if (endpoint.isSource && !this.isConnectionDragged) { jsPlumbPort.addClass('port-active'); }
      });
      jsPlumbPort.bind('mouseout', () => {
        this.onMouseOut();
        if (jsPlumbPort.id !== this.selectedPortId) { jsPlumbPort.removeClass('port-active'); }
      });
      jsPlumbPort.bind('click', (reference: any) => {
        if (hasReport) {
          this.selectedPortId = jsPlumbPort.id;
          this.onMouseClick({ reference, port });
          this.removeActivePortClasses();
          jsPlumbPort.addClass('port-active');
        }
      });

      const portType = this.GraphStyleService.getOutputTypeFromQualifier(port.typeQualifier[0]);
      const isDataOutput = portType === 'default';
      if (isDataOutput) { jsPlumbPort.addClass('dataframe-output-port'); }
      if (hasReport) { jsPlumbPort.addClass('has-report sa sa-chart'); }
      jsPlumbPort.addClass('output');
      jsPlumbPort.addClass(portType);
      jsPlumbPort.setParameter('portIndex', port.index);
      jsPlumbPort.setParameter('nodeId', node.id);
    });
  }

  startDragging(connection: any): void {
    this.isConnectionDragged = true;
    this.GraphStyleService.enablePortHighlighting(this.nodes, connection.endpoints[0]);
  }

  stopDragging(): void {
    this.isConnectionDragged = false;
    this.GraphStyleService.disablePortHighlighting(this.nodes);
  }

  renderInputPorts(node: any, ports: any[]): void {
    ports.forEach((port: any) => {
      const style = this.GraphStyleService.getStyleForPort(port);
      const portType = this.GraphStyleService.getOutputTypeFromQualifier(port.typeQualifier[0]);
      const jsPlumbPort = (jsPlumb as any).addEndpoint(node, style, {
        anchor: POSITION_MAP.INPUT[port.portPosition],
        uuid: port.id
      });
      jsPlumbPort.bind('mouseover', (endpoint: any) => {
        this.onMouseOver(endpoint.canvas, port);
        if (!this.isConnectionDragged) { jsPlumbPort.addClass('port-active'); }
      });
      jsPlumbPort.bind('mouseout', () => {
        this.onMouseOut();
        jsPlumbPort.removeClass('port-active');
      });
      jsPlumbPort.addClass(portType);
      jsPlumbPort.setParameter('portIndex', port.index);
    });
  }

  renderEdges(edges: any): void {
    (jsPlumb as any).detachEveryConnection();
    const outputPrefix = 'output';
    const inputPrefix = 'input';
    for (const id of Object.keys(edges)) {
      const edge = edges[id];
      const detachable = (edge.id === NEW_NODE_EDGE.id) ? false : this.isEditable;
      const connection = (jsPlumb as any).connect({
        uuids: [
          `${outputPrefix}-${edge.startPortId}-${edge.startNodeId}`,
          `${inputPrefix}-${edge.endPortId}-${edge.endNodeId}`
        ],
        detachable
      });
      connection.setParameter('edgeId', edge.id);
    }
  }

  removeNodes(nodesIdsToRemove: string[]): void {
    nodesIdsToRemove.forEach((nodeId: string) => {
      const node = this.GraphStyleService.getNodeElementById(nodeId);
      (jsPlumb as any).remove(node);
    });
  }

  removeActivePortClasses(): void {
    (jsPlumb as any).selectEndpoints().each((endpoint: any) => {
      if (endpoint.id !== this.selectedPortId) { endpoint.removeClass('port-active'); }
    });
  }
}
