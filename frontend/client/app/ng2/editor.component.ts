/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import {
  Component, Input, Inject, ElementRef, ChangeDetectorRef,
  AfterViewInit, DoCheck, OnDestroy
} from '@angular/core';
import { UUIDGenerator } from './uuid-generator.service';
import { OperationsService } from './operations.service';
import { OperationsHierarchyService } from './operations-hierarchy.service';
import { MouseEvent as MouseEventService } from './mouse-event.service';
import '../workflows/editor/editor.less';

// jQuery is provided globally by webpack (ProvidePlugin $ -> jquery).
declare const $: any;

const NEW_NODE_ELEMENT_WIDTH = 200;
const ZOOM_STEP = 0.05;
const TRANSITION_TIME = 0.5;

// Phase C canvas finale: migrated from workflows/editor (editor.component.js + editor.controller.js). The
// editor-view orchestrator — the last AngularJS piece of the editor. Downgraded as directive 'editor';
// workflows-editor.html (still AngularJS) rebinds to Angular syntax. Its template now hosts the child Angular
// components directly (canvas-toolbar / create-node-invitation / core-canvas + projected new-node /
// port-status-tooltip). ui-router is untouched — editor is just a downgraded component inside the state's
// AngularJS template.
//
// Ports of AngularJS idioms:
//  - $scope.$watch(workflow.getNodes) -> guarded ngDoCheck (canShowInvitationToCreate).
//  - $postLink -> ngAfterViewInit (jQuery DOM event wiring + containment + AdapterService port callbacks).
//  - $element -> ElementRef; $rootScope stays bridged (Keyboard.KEY_PRESSED_DEL listener).
//  - startWizard's `newNodeData=null; $rootScope.$digest(); ...` (force the *ngIf new-node to recreate so its
//    focus/rect re-run) -> null + cdr.detectChanges() to flush teardown, then set + detectChanges() to create.
//  - show/hideTooltip are invoked by AdapterService from jsPlumb port hover (outside Angular CD), so they
//    detectChanges() to push the port-status-tooltip binding.
@Component({
  standalone: false,
  selector: 'editor',
  template: `
    <div class="editor">
      <canvas-toolbar
        [isEditable]="isEditable"
        (onZoomIn)="zoomIn($event)"
        (onZoomOut)="zoomOut($event)"
        (onFit)="fit($event)"
        (onNewNode)="newNode($event)"
      ></canvas-toolbar>

      <create-node-invitation
        *ngIf="canShowInvitationToCreate"
        class="create-node-invitation-wrapper"
      ></create-node-invitation>

      <core-canvas
        [isEditable]="isEditable"
        [newNodeData]="newNodeData"
        [workflow]="workflow"
        (onConnectionAbort)="onConnectionAbort($event)"
      >
        <new-node
          *ngIf="newNodeData"
          [ngStyle]="{ 'left': newNodeData.x + 'px', 'top': newNodeData.y + 'px' }"
          class="flowchart-box__new-node new-node"
          id="node-new-node"
          [categories]="categories"
          [containment]="containment"
          (onSelect)="onSelect($event)"
          (onDisplayRectChange)="onDisplayRectChange($event)"
          jsplumb-draggable
        ></new-node>
      </core-canvas>

      <port-status-tooltip
        *ngIf="isTooltipVisible"
        [ngStyle]="{ 'top': tooltipY + 'px', 'left': tooltipX + 'px' }"
        [portObject]="portObject"
      ></port-status-tooltip>
    </div>
  `
})
export class EditorComponent implements AfterViewInit, DoCheck, OnDestroy {
  @Input() isEditable: boolean;
  @Input() workflow: any;

  categories: any;
  canShowInvitationToCreate = false;
  newNodeData: any = null;
  containment: any;

  isTooltipVisible = false;
  portObject: any = null;
  portElement: any = null;
  tooltipX: number;
  tooltipY: number;

  private $element: any;
  private $canvas: any;
  private $toolbar: any;
  private removeListener: () => void;

  constructor(
    private host: ElementRef,
    private cdr: ChangeDetectorRef,
    @Inject('$rootScope') private $rootScope: any,
    @Inject('CanvasService') private CanvasService: any,
    @Inject('AdapterService') private AdapterService: any,
    private UUIDGenerator: UUIDGenerator,
    private Operations: OperationsService,
    private OperationsHierarchyService: OperationsHierarchyService,
    private MouseEvent: MouseEventService
  ) {
    this.$element = $(this.host.nativeElement);
    this.categories = this.Operations.getCatalog();
    this.removeListener = this.$rootScope.$on('Keyboard.KEY_PRESSED_DEL', () => this.hideTooltip());
  }

  // Legacy $scope.$watch(workflow.getNodes): show the "create your first node" invitation on an empty graph.
  ngDoCheck(): void {
    const empty = !!(this.workflow && this.workflow.getNodes &&
      Object.keys(this.workflow.getNodes()).length === 0);
    if (empty !== this.canShowInvitationToCreate) {
      this.canShowInvitationToCreate = empty;
    }
  }

  ngAfterViewInit(): void {
    this.bindEvents();
    this.containment = $(this.host.nativeElement.querySelector('.editor'));
    this.AdapterService.setMouseOverOnPortFunction((portEl: any, portObject: any) => this.showTooltip(portEl, portObject));
    this.AdapterService.setMouseOutOnPortFunction(() => this.hideTooltip());
  }

  ngOnDestroy(): void {
    if (this.$canvas) { this.$canvas.off(); }
    this.$element.off();
    if (this.removeListener) { this.removeListener(); }
  }

  private bindEvents(): void {
    const root = this.host.nativeElement;
    this.$canvas = $(root.querySelector('core-canvas'));
    this.$toolbar = $(root.querySelector('canvas-toolbar'));

    this.$canvas.bind('wheel', ($event: any) => {
      const cursorX = $event.originalEvent.clientX - root.getBoundingClientRect().left;
      const cursorY = $event.originalEvent.clientY - root.getBoundingClientRect().top;
      const FF_ZOOM_RATIO = 17;
      const normalizedZoom = (!$event.originalEvent.wheelDelta)
        ? $event.originalEvent.deltaY * FF_ZOOM_RATIO : $event.originalEvent.deltaY;
      const zoomDelta = normalizedZoom / 1000;
      this.CanvasService.zoomToPosition(zoomDelta, cursorX, cursorY);
    });

    const moveHandler = ($event: any) => {
      if (this.MouseEvent.isModKeyDown($event)) {
        this.CanvasService.moveWindow($event.originalEvent.movementX, $event.originalEvent.movementY);
      } else {
        this.$canvas.off('mousemove', moveHandler);
      }
    };

    this.$canvas.bind('mousedown', ($event: any) => {
      if (this.MouseEvent.isModKeyDown($event)) {
        this.$canvas.bind('mousemove', moveHandler);
      }
    });
    this.$canvas.bind('mouseup', () => {
      this.$canvas.off('mousemove', moveHandler);
    });

    this.$canvas.bind('drop', ($event: any) => {
      const originalEvent = $event.originalEvent;
      if (originalEvent.dataTransfer.getData('draggableExactType') === 'graphNode') {
        this.startWizardFromEvent($event);
      }
    });

    this.$element.bind('mousedown', () => {
      if (this.newNodeData) {
        this.newNodeData = null;
        this.cdr.detectChanges();
      }
    });

    this.$toolbar.bind('mousedown', ($event: any) => {
      $event.stopPropagation();
    });

    this.$canvas.bind('contextmenu', ($event: any) => {
      this.startWizardFromEvent($event);
      return false;
    });

    // Restore focus to the canvas after clicking inside the editor (used by the cloning service).
    this.$canvas.bind('click', () => {
      const canvas = this.$canvas[0].querySelector('.canvas');
      if (canvas) { canvas.focus(); }
    });
  }

  zoomIn(): void { this.CanvasService.centerZoom(ZOOM_STEP); }
  zoomOut(): void { this.CanvasService.centerZoom(-1 * ZOOM_STEP); }
  fit(): void { this.CanvasService.fit(); }
  fullScreen(): void { /* TODO: add after the design of scene changes */ }

  newNode(): void {
    const [x, y] = this.CanvasService.translateScreenToCanvasPosition(100, 100);
    this.startWizard(x, y);
  }

  onConnectionAbort(newNodeData: any): void {
    const portPositionX = newNodeData.x - (NEW_NODE_ELEMENT_WIDTH / 2 * this.CanvasService.scale);
    const portPositionY = newNodeData.y - this.host.nativeElement.getBoundingClientRect().top;
    const [x, y] = this.CanvasService.translateScreenToCanvasPosition(portPositionX, portPositionY);
    this.startWizard(x, y, newNodeData.endpoint);
  }

  startWizardFromEvent($event: any): void {
    const positionX = $event.clientX;
    const positionY = $event.clientY - this.host.nativeElement.getBoundingClientRect().top;
    const [x, y] = this.CanvasService.translateScreenToCanvasPosition(positionX, positionY);
    this.startWizard(x, y);
  }

  startWizard(x: number, y: number, endpoint: any = null): void {
    // Recreate the new-node popover (its *ngIf) so its focus + rect emit re-run: null + flush, then set.
    this.newNodeData = null;
    this.cdr.detectChanges();
    if (this.isEditable) {
      const newNodeData: any = { x, y, nodeId: null, portIndex: null, typeQualifier: null };
      if (endpoint) {
        newNodeData.nodeId = endpoint.getParameter('nodeId');
        newNodeData.portIndex = endpoint.getParameter('portIndex');
        newNodeData.typeQualifier =
          this.workflow.getNodeById(newNodeData.nodeId).output[newNodeData.portIndex].typeQualifier;
        const catalog = this.Operations.getCatalog();
        const filterForCatalog = this.Operations.getFilterForTypeQualifier(newNodeData.typeQualifier[0]);
        this.categories = this.Operations.filterCatalog(catalog, filterForCatalog as any);
      } else {
        this.categories = this.Operations.getCatalog();
      }
      this.newNodeData = newNodeData;
      this.cdr.detectChanges();
    }
  }

  onDisplayRectChange(rect: any): void {
    let delta;
    const { left, right, bottom } = this.containment[0].getBoundingClientRect();
    delta = Math.min(right - rect.right, 0);
    if (delta === 0) {
      delta = Math.max(left - rect.left, 0);
    }
    this.CanvasService.moveWindow(delta, Math.min(bottom - rect.bottom, 0), TRANSITION_TIME);
  }

  onSelect(operationId: any): void {
    const newNodeElement = this.host.nativeElement.querySelector('new-node');
    const params = {
      id: this.UUIDGenerator.generateUUID(),
      x: newNodeElement.offsetLeft,
      y: newNodeElement.offsetTop,
      operation: this.Operations.get(operationId)
    };
    const node = this.workflow.createNode(params);
    this.workflow.addNode(node);
    if (this.newNodeData && this.newNodeData.nodeId) {
      const newEdge = this.workflow.createEdge({
        from: { nodeId: this.newNodeData.nodeId, portIndex: this.newNodeData.portIndex },
        to: { nodeId: node.id, portIndex: this.getMatchingPortIndex(node, this.newNodeData.typeQualifier) }
      });
      this.workflow.addEdge(newEdge);
    }
    this.newNodeData = null;
  }

  getMatchingPortIndex(node: any, typeQualifier: any): number {
    let portIndex = 0;
    node.input.forEach((port: any, index: number) => {
      if (this.OperationsHierarchyService.IsDescendantOf(typeQualifier, port.typeQualifier)) {
        portIndex = index;
      }
    });
    return portIndex;
  }

  // Invoked by AdapterService from jsPlumb port hover (outside Angular CD) -> detectChanges to push binding.
  showTooltip(portEl: any, portObject: any): void {
    this.portElement = portEl;
    this.portObject = portObject;
    this.isTooltipVisible = true;
    [this.tooltipX, this.tooltipY] = this.getPosition();
    this.cdr.detectChanges();
  }

  hideTooltip(): void {
    this.portElement = null;
    this.portObject = null;
    this.isTooltipVisible = false;
    this.cdr.detectChanges();
  }

  getPosition(): [number, number] {
    const adjustment = (this.portObject.type === 'input') ? -5 : 5;
    return [
      Math.round(this.portElement.getBoundingClientRect().right),
      Math.round(this.portElement.getBoundingClientRect().top - this.$canvas[0].getBoundingClientRect().top + adjustment)
    ];
  }
}
