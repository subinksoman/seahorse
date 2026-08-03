/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Component, Input, Inject, OnInit, HostListener } from '@angular/core';
import { specialOperations } from '../enums/special-operations.js';
import { actionIcons } from '../workflows/editor/core-canvas/graph-node/action-icons.js';
import { WorkflowService } from './workflow.service';
import '../workflows/editor/core-canvas/graph-node/graph-node.less';
import '../workflows/editor/core-canvas/graph-node/datasource-node/datasource-node.less';

const nodeTypes = {
  ACTION: 'action',
  SOURCE_OR_SINK: 'source-or-sink',
  DATASOURCE: 'datasource',
  UNKNOWN: 'unknown',
  STANDARD: 'standard'
};

// Phase C-2 / canvas: migrated from workflows/editor/core-canvas/graph-node. The node box rendered
// (ng-repeat) in canvas.html and made draggable by the AngularJS jsplumb-draggable/keyboard directives
// on the same host element (they compose with this downgraded component). The legacy ng-include over
// standard/datasource templates becomes an *ngSwitch on nodeType; the datasource-node mixin methods are
// folded in. $element click/mousedown/mouseup -> @HostListener broadcasting on the bridged $rootScope.
// Injects the Angular WorkflowService directly; GraphStyleService/datasourcesService/DatasourcesPanelService
// are bridged. Derived values (nodeType/border/actionIcon) computed once in ngOnInit. Downgraded as
// directive 'graphNode'; canvas.html rebound node="node" -> [node]="node".
//
// NEEDS INTERACTIVE QA: node drag (jsplumb-draggable), click-to-select, datasource-panel open, borders.
@Component({
  standalone: false,
  selector: 'graph-node',
  template: `
   <ng-container [ngSwitch]="nodeType === 'datasource'">
    <!-- datasource node -->
    <div *ngSwitchCase="true"
         class="graph-node {{ nodeType }} {{ borderClass }}"
         [ngClass]="{ 'selected-node': isSelected }"
         [title]="node.description">
      <div class="graph-node__content">
        <div class="operation-name">{{ node.name }}</div>
        <div *ngIf="node.uiName" class="custom-name">{{ node.uiName }}</div>
        <div class="datasource-name" [ngClass]="{ 'datasource-name--disabled': !isEditable() }">
          <span (click)="openDatasourcePanel()">{{ getDatasourceName() }}</span>
        </div>
      </div>
      <status-icon *ngIf="isOwner()" [node]="node" class="graph-node__status-icon"></status-icon>
    </div>

    <!-- standard / action / source-or-sink / unknown node -->
    <div *ngSwitchDefault
         class="graph-node {{ nodeType }} {{ borderClass }}"
         [title]="node.description">
      <div class="graph-node__content">
        <div class="operation-name">
          <span *ngIf="nodeType === 'action'" class="action-icon sa {{ actionIcon }}"></span>
          <span>{{ node.name }}</span>
        </div>
        <div *ngIf="node.uiName" class="custom-name">{{ node.uiName }}</div>
      </div>
      <status-icon *ngIf="isOwner()" [node]="node" class="graph-node__status-icon"></status-icon>
    </div>
   </ng-container>
  `
})
export class GraphNodeComponent implements OnInit {
  @Input() node: any;
  @Input() isSelected: boolean;

  nodeType: string;
  borderClass = '';
  actionIcon: string;

  constructor(
    @Inject('$rootScope') private $rootScope: any,
    private WorkflowService: WorkflowService,
    @Inject('GraphStyleService') private GraphStyleService: any,
    @Inject('datasourcesService') private datasourcesService: any,
    @Inject('DatasourcesPanelService') private DatasourcesPanelService: any
  ) {}

  ngOnInit(): void {
    this.actionIcon = actionIcons[this.node.operationId];
    this.nodeType = this.getNodeType();
    this.borderClass = this.nodeType === nodeTypes.DATASOURCE ? this.getBorderColor() : this.getBorderCssClass();
  }

  @HostListener('click', ['$event'])
  onClick($event: any): void { this.broadcastEvent('GraphNode.CLICK', $event); }

  @HostListener('mousedown', ['$event'])
  onMouseDown($event: any): void { this.broadcastEvent('GraphNode.MOUSEDOWN', $event); }

  @HostListener('mouseup', ['$event'])
  onMouseUp($event: any): void { this.broadcastEvent('GraphNode.MOUSEUP', $event); }

  private broadcastEvent(eventType: string, $event: any): void {
    this.$rootScope.$broadcast(eventType, {
      originalEvent: $event,
      selectedNode: this.node
    });
  }

  getNodeType(): string {
    const operationId = this.node.operationId;
    if (Object.values(specialOperations.ACTIONS).includes(operationId)) {
      return nodeTypes.ACTION;
    } else if (operationId === specialOperations.CUSTOM_TRANSFORMER.SINK ||
      operationId === specialOperations.CUSTOM_TRANSFORMER.SOURCE) {
      return nodeTypes.SOURCE_OR_SINK;
    } else if (Object.values(specialOperations.DATASOURCE).includes(operationId)) {
      return nodeTypes.DATASOURCE;
    } else if (operationId === specialOperations.UNKNOWN_OPERATION) {
      return nodeTypes.UNKNOWN;
    } else {
      return nodeTypes.STANDARD;
    }
  }

  isEditable(): boolean {
    return this.WorkflowService.isWorkflowEditable();
  }

  isOwner(): boolean {
    return this.WorkflowService.isCurrentUserOwnerOfCurrentWorkflow();
  }

  getBorderCssClass(): string {
    let typeQualifier;
    if (this.node.operationId === specialOperations.UNKNOWN_OPERATION) {
      return 'border-unknown';
    }
    if (this.node.input && this.node.input.length === 1) {
      typeQualifier = this.node.input[0].typeQualifier[0];
    } else if (this.node.originalOutput && this.node.originalOutput.length === 1) {
      typeQualifier = this.node.originalOutput[0].typeQualifier[0];
    }
    const type = this.GraphStyleService.getOutputTypeFromQualifier(typeQualifier);
    return `border-${type}`;
  }

  // The legacy datasource template referenced getBorderColor(), which was never defined on the
  // controller (AngularJS silently returned undefined -> no border class). Preserve that (empty).
  getBorderColor(): string {
    return '';
  }

  // --- datasource-node behaviour (folded in from the datasourceNode mixin) ---
  openDatasourcePanel(): void {
    if (!this.isEditable()) {
      return;
    }
    this.DatasourcesPanelService.setHandlerOnDatasourceSelect((datasource: any) => this.setDatasource(datasource));
    if (this.node.operationId === specialOperations.DATASOURCE.READ) {
      this.DatasourcesPanelService.openDatasourcesForReading();
    } else {
      this.DatasourcesPanelService.openDatasourcesForWriting();
    }
  }

  setDatasource(datasource: any): void {
    this.DatasourcesPanelService.closeDatasources();
    this.node.parameters.parameters[0].value = datasource.id;
  }

  getDatasourceName(): string {
    const datasourceId = this.getDatasourceId();
    if (datasourceId) {
      const datasource = this.datasourcesService.datasources.find((d: any) => d.id === datasourceId);
      return datasource ? datasource.params.name : 'Select data source';
    } else if (this.node.operationId === specialOperations.DATASOURCE.READ) {
      return 'Select data source';
    } else if (this.node.operationId === specialOperations.DATASOURCE.WRITE) {
      return 'Select emplacement';
    }
    return '';
  }

  getDatasourceId(): string {
    if (this.node.parametersValues) {
      return this.node.parametersValues['data source'];
    } else if (this.node.parameters && this.node.parameters.parameters[0].value) {
      return this.node.parameters.parameters[0].value;
    } else {
      return '';
    }
  }
}
