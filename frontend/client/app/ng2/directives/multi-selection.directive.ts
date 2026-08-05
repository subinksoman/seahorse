/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Directive, Input, Inject, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import jsPlumb from 'jsplumb';
import * as _ from 'lodash';
import { MouseEvent as MouseEventService } from '../services/mouse-event.service';
import { MultiSelectionService } from '../services/multi-selection.service';

// jQuery is provided globally by webpack (ProvidePlugin $ -> jquery); declare it for TS.
declare const $: any;

// Phase C / canvas finale (2/2): Angular port of workflows/graph-panel/multi-selection/multi-selection.js.
// Rubber-band + ctrl-click node selection on the flowchart paint area. Faithful 1:1 port of the legacy
// directive link(): the injected AngularJS deps become bridged tokens ($document/$timeout/$rootScope/debounce)
// + the already-migrated Angular MouseEvent/MultiSelectionService classes; scope.$ctrl.workflow -> @Input
// workflow; scope.$on(...) -> bridged $rootScope.$on (unregistered in ngOnDestroy); the closure `that`
// methods become instance methods. DOM/jQuery/jsPlumb selection logic is unchanged.
@Directive({ standalone: false, selector: '[multi-selection]' })
export class MultiSelectionDirective implements AfterViewInit, OnDestroy {
  @Input() workflow: any;

  private el: HTMLElement;
  private $element: any;
  private selectionElement: HTMLElement;
  private $selectionElement: any;
  private startPoint = { x: 0, y: 0 };
  private elementDimensions: { width: number; height: number };
  private inSelection: HTMLElement[] = [];
  private workflowNodes: any;
  private disabled: boolean;
  private viewFix: () => void;
  private unregisters: Array<() => void> = [];

  private readonly CLASS_NAME = 'selection-element';
  private readonly CTRL_KEY = true;
  private readonly axisToWord: any = {
    x: { original: 'left', opposite: 'right', dimension: 'width' },
    y: { original: 'top', opposite: 'bottom', dimension: 'height' }
  };

  // was the bridged $document (angular.element(document)); $(document) is the identical jQuery wrapper.
  private $document: any = $(document);

  constructor(
    private host: ElementRef,
    @Inject('$rootScope') private $rootScope: any,
    private mouseEvent: MouseEventService,
    private multiSelectionService: MultiSelectionService
  ) {}

  ngAfterViewInit(): void {
    this.el = this.host.nativeElement;
    this.$element = $(this.el);
    this.selectionElement = this.$document[0].createElement('div');
    this.$selectionElement = $(this.selectionElement);

    // was rt.debounce debounce(50, fn, immediate=true) = leading edge -> lodash leading/no-trailing.
    this.viewFix = _.debounce(() => {
      const oldRepaintValue = this.$selectionElement[0].style.left;
      const newRepaintValue = parseInt(this.$selectionElement[0].style.left, 10) - 1;
      this.$selectionElement[0].style.left = newRepaintValue ? `${newRepaintValue}px` : 'auto';
      setTimeout(() => { // was $timeout(fn, false) — a zero-delay defer
        this.$selectionElement[0].style.left = oldRepaintValue;
      });
    }, 50, { leading: true, trailing: false });

    // Bind lifecycle events (legacy scope.$on -> bridged $rootScope.$on; store unregister fns).
    this.unregisters.push(this.$rootScope.$on('GraphNode.MOUSEDOWN', (e: any, data: any) => this.graphNodeMouseDownHandler(e, data)));
    this.unregisters.push(this.$rootScope.$on('GraphNode.MOUSEUP', (e: any, data: any) => this.graphNodeMouseUpHandler(e, data)));
    this.unregisters.push(this.$rootScope.$on('INTERACTION-PANEL.MOVE-GRAB', (e: any, data: any) => { this.disabled = data.active; }));
    this.unregisters.push(this.$rootScope.$on('MultiSelection.ADD', (e: any, nodeIds: any) => this.addToSelection(nodeIds)));
    this.unregisters.push(this.$rootScope.$on('MultiSelection.CLEAR_ALL', () => this.clearAllFromSelection()));

    this.init();
  }

  ngOnDestroy(): void {
    this.$document.off('mouseup', this.endPainting);
    this.$document.off('mousemove', this.paint);
    this.unregisters.forEach((u) => u && u());
  }

  private init(): void {
    this.selectionElement.className = this.CLASS_NAME;
    this.selectionElement.style.display = 'none';
    this.$element.append(this.selectionElement);
    this.$element.on('mousedown', this.startPainting);
    this.$element.on('mousedown', this.clearNodes);
  }

  private intersect(A: any, B: any): boolean {
    return A.left <= B.right && A.top <= B.bottom && B.top <= A.bottom && B.left <= A.right;
  }

  private getWorkflow(): any {
    return this.workflow;
  }

  // Arrow-function fields so they keep `this` when used as jQuery/document event handlers.
  private startPainting = (event: any): void => {
    if (event.target === this.el) {
      event.preventDefault();
    }

    this.$document.on('mousemove', this.paint);
    this.$document.on('mouseup', this.endPainting);

    if (this.disabled || event.button !== 0) {
      return;
    }

    this.startPoint = this.mouseEvent.getEventOffsetOfElement(event, this.el.parentElement);

    this.workflowNodes = this.workflowNodes || _.map(this.getWorkflow().getNodes(), (node: any) => {
      return {
        x: node.x,
        y: node.y,
        height: $(this.el.querySelector('#node-' + node.id)).outerHeight(true),
        width: $(this.el.querySelector('#node-' + node.id)).outerWidth(true),
        id: node.id
      };
    });

    this.elementDimensions = this.elementDimensions || {
      width: this.el.clientWidth,
      height: this.el.clientHeight
    };

    this.$element.addClass('has-cursor-crosshair');
    this.$selectionElement.css({ top: this.startPoint.y, left: this.startPoint.x });
    this.$selectionElement.stop().fadeIn(200);
  };

  private endPainting = (): void => {
    this.$element.removeClass('has-cursor-crosshair');
    this.$selectionElement.fadeOut(100, () => {
      this.$selectionElement.css({ left: 0, top: 0, width: 0, height: 0 });
    });
    this.workflowNodes = null;
    this.$document.off('mousemove', this.paint);
    this.$document.off('mouseup', this.endPainting);
  };

  private calculate(axis: string, diff: any): void {
    if (diff[axis] < 0) {
      this.$selectionElement.css(this.axisToWord[axis].original, 'auto');
      this.$selectionElement.css(this.axisToWord[axis].opposite,
        this.elementDimensions[this.axisToWord[axis].dimension] - (this.startPoint as any)[axis]);
    } else {
      this.$selectionElement.css(this.axisToWord[axis].original, (this.startPoint as any)[axis]);
      this.$selectionElement.css(this.axisToWord[axis].opposite, 'auto');
    }
  }

  private selectNodes(selectionElementDimensions: any): void {
    this.clearAllFromSelection();
    this.filterNodes(selectionElementDimensions);
  }

  private filterNodes(selectionElementDimensions: any): void {
    const interceptedNodes = _.filter(this.workflowNodes, (node: any) => {
      return this.intersect({
        left: node.x, top: node.y, right: node.x + node.width, bottom: node.y + node.height
      }, {
        left: Math.min(this.startPoint.x, this.startPoint.x + selectionElementDimensions.width),
        top: Math.min(this.startPoint.y, this.startPoint.y + selectionElementDimensions.height),
        right: Math.max(this.startPoint.x, this.startPoint.x + selectionElementDimensions.width),
        bottom: Math.max(this.startPoint.y, this.startPoint.y + selectionElementDimensions.height)
      });
    });
    _.each(interceptedNodes, (node: any) => {
      this.multiSelectionService.addNodeIdsToSelection([node.id]);
      this.addToSelection([node.id]);
    });
  }

  private paint = (event: any): void => {
    const currentPoint = this.mouseEvent.getEventOffsetOfElement(event, this.el.parentElement);
    const diff = { x: currentPoint.x - this.startPoint.x, y: currentPoint.y - this.startPoint.y };
    const selectionElementDimensions = { width: diff.x, height: diff.y };

    this.$selectionElement.css({
      width: Math.abs(selectionElementDimensions.width),
      height: Math.abs(selectionElementDimensions.height)
    });

    this.calculate('x', diff);
    this.calculate('y', diff);

    if (this.mouseEvent.isModKeyDown(event)) {
      this.filterNodes(selectionElementDimensions);
    } else {
      this.selectNodes(selectionElementDimensions);
    }

    this.viewFix();
  };

  private addToSelection(nodeIDs: any): void {
    const DOMNodes = _.map(nodeIDs, (nodeId: any) => {
      const DOMNode = this.findDOMNodeById(nodeId);
      DOMNode.classList.add('graph-node--active');
      jsPlumb.addToDragSelection(DOMNode);
      return DOMNode;
    });
    this.multiSelectionService.addNodeIdsToSelection(nodeIDs);
    this.inSelection = _.union(this.inSelection, DOMNodes);
  }

  private removeFromSelection(nodeIDs: any): void {
    const DOMNodes = _.map(nodeIDs, (nodeId: any) => {
      const DOMNode = this.findDOMNodeById(nodeId);
      DOMNode.classList.remove('graph-node--active');
      jsPlumb.removeFromDragSelection(DOMNode);
      return DOMNode;
    });
    this.multiSelectionService.removeNodeIdsFromSelection(nodeIDs);
    this.inSelection = _.difference(this.inSelection, DOMNodes);
  }

  private clearAllFromSelection(): void {
    _.each(this.inSelection, (DOMNode: any) => {
      DOMNode.classList.remove('graph-node--active');
    });
    this.multiSelectionService.clearSelection();
    jsPlumb.clearDragSelection();
    this.inSelection = [];
  }

  private findDOMNodeById(nodeId: any): HTMLElement {
    return this.$document[0].getElementById(`node-${nodeId}`);
  }

  private clearNodes = (event: any): void => {
    if (!this.mouseEvent.isModKeyDown(event)) {
      this.multiSelectionService.clearSelection();
      this.clearAllFromSelection();
      this.viewFix();
    }
  };

  private graphNodeMouseDownHandler(event: any, data: any): void {
    if (this.mouseEvent.isModKeyDown(data.originalEvent)) {
      if (this.multiSelectionService.isAlreadyAddedToSelection(data.selectedNode)) {
        this.multiSelectionService.removeNodeIdsFromSelection([data.selectedNode.id]);
        this.removeFromSelection([data.selectedNode.id]);
      } else {
        this.multiSelectionService.addNodeIdsToSelection([data.selectedNode.id]);
        this.addToSelection([data.selectedNode.id]);
      }
    } else {
      if (!this.multiSelectionService.isAlreadyAddedToSelection(data.selectedNode)) {
        this.multiSelectionService.clearSelection();
        this.clearAllFromSelection();
      }
      this.multiSelectionService.addNodeIdsToSelection([data.selectedNode.id]);
      this.addToSelection([data.selectedNode.id]);
    }
    this.endPainting();
  }

  private graphNodeMouseUpHandler(_event: any, _data: any): void {
    this.$rootScope.$broadcast('MultipleSelection.STOP_DRAG');
  }
}
