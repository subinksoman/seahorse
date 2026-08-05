/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import {
  Component, Input, Output, EventEmitter, Inject, ElementRef,
  AfterViewInit, OnChanges, SimpleChanges
} from '@angular/core';
import '../workflows/editor/core-canvas/canvas.less';

// Phase C / canvas finale: migrated from workflows/editor/core-canvas/canvas.component.js. The jsPlumb host.
// Downgraded as directive 'coreCanvas'; editor.html rebinds to Angular syntax and projects <new-node> into
// <ng-content> (the legacy transclude). Injects the bridged CanvasService + AdapterService.
//  - canvas.html moved inline: ng-repeat graph-nodes -> *ngFor (graph-node is the Angular component now, with
//    the Angular jsplumb-draggable directive; keyboard moved to the canvas root, bound once instead of once
//    per node); multi-selection is the Angular directive; ng-transclude -> <ng-content>.
//  - $postLink -> ngAfterViewInit (CanvasService.initialize + first render + onConnectionAbort wiring);
//    $onChanges -> ngOnChanges. The `&` onConnectionAbort -> @Output (AdapterService is handed a thunk that
//    emits). Renders happen on the next macrotask (legacy used $timeout) so the *ngFor DOM exists first.
@Component({
  standalone: false,
  selector: 'core-canvas',
  template: `
    <div class="canvas sliding-window" tabindex="1" keyboard
         [ngClass]="{ 'disabled': !isEditable && workflow?.sessionStatus !== 'running' }">
      <div class="flowchart-paint-area" multi-selection [workflow]="workflow">
        <div class="new-node-container"><ng-content></ng-content></div>
        <graph-node *ngFor="let node of nodesArray; trackBy: trackByNodeId"
                    [id]="'node-' + node.id"
                    class="graph-node-component"
                    [ngStyle]="{ 'left': node.x + 'px', 'top': node.y + 'px', 'border-color': node.color }"
                    jsplumb-draggable [node]="node"></graph-node>
      </div>
    </div>
  `
})
export class CoreCanvasComponent implements AfterViewInit, OnChanges {
  @Input() isEditable: boolean;
  @Input() newNodeData: any;
  @Input() workflow: any;
  // eslint-disable-next-line @angular-eslint/no-output-on-prefix — legacy contract name kept for parent parity.
  @Output() onConnectionAbort = new EventEmitter<any>();

  constructor(
    private host: ElementRef,
    @Inject('CanvasService') private CanvasService: any,
    @Inject('AdapterService') private AdapterService: any
  ) {}

  get nodesArray(): any[] {
    return this.workflow ? Object.values(this.workflow.getNodes()) : [];
  }

  trackByNodeId(_index: number, node: any): any {
    return node && node.id;
  }

  ngAfterViewInit(): void {
    const root = this.host.nativeElement;
    const jsPlumbContainer = root.querySelector('.flowchart-paint-area');
    const slidingWindow = root.querySelector('.sliding-window');

    this.CanvasService.initialize(jsPlumbContainer, slidingWindow);
    // AdapterService calls this fn with { newNodeData }; re-emit the inner value up to the editor.
    this.AdapterService.setOnConnectionAbortFunction((arg: any) => {
      this.onConnectionAbort.emit(arg && arg.newNodeData);
    });

    setTimeout(() => this.CanvasService.render());
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.isEditable) {
      this.CanvasService.setEditable(changes.isEditable.currentValue);
    }
    if (changes.workflow && changes.workflow.currentValue) {
      this.CanvasService.setWorkflow(changes.workflow.currentValue);
      this.CanvasService.fit();
    }
    if (changes.newNodeData) {
      this.AdapterService.setNewNodeData(changes.newNodeData.currentValue);
    }
    // Render on the next macrotask because the *ngFor node elements are not in the DOM yet (legacy $timeout).
    setTimeout(() => this.CanvasService.render());
  }
}
