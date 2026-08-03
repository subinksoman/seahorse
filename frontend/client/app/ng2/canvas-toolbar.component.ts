/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Component, Input, Output, EventEmitter, Inject, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { DragAndDrop } from './drag-and-drop.service';
import '../workflows/editor/canvas-toolbar/canvas-toolbar.less';

// Phase C / canvas: migrated from workflows/editor/canvas-toolbar. The floating zoom/fit/add toolbar.
// Downgraded as directive 'canvasToolbar'; its editor.html usage rebinds to Angular syntax (kebab-case
// [is-editable] input + (on-*) outputs). The five `&` outputs -> @Outputs.
//
// The "add operation" drag source used two AngularJS directives (`draggable-type="exact"` +
// `draggable-exact-type="graphNode"` from common-draggable.js) plus the component's own jQuery drag-ghost.
// An Angular @Component template can't host those AngularJS directives, so BOTH are reimplemented inline in
// onDragStart: keep the native draggable="true", set the same dataTransfer keys the legacy directive set,
// and call the already-migrated Angular DragAndDrop service. editor.controller.js's manual canvas `drop`
// handler reads dataTransfer.getData('draggableExactType')==='graphNode' unchanged, so the drop side is
// untouched. onFullScreen is kept but stays dead (the legacy attr `on-fullscreen` never matched the
// `onFullScreen` binding and there is no fullscreen button — preserved as-is).
@Component({
  standalone: false,
  selector: 'canvas-toolbar',
  template: `
    <div class="canvas-toolbar">
      <div class="canvas-toolbar__drag-handle"></div>
      <div #dragNode
           *ngIf="isEditable"
           (click)="onNewNode.emit($event)"
           (dragstart)="onDragStart($event)"
           (dragend)="onDragEnd($event)"
           class="canvas-toolbar__item node active drag-node"
           draggable="true"
           title="Add new operations"></div>
      <div class="canvas-toolbar__item node" *ngIf="!isEditable"></div>
      <div (click)="onZoomIn.emit($event)" class="canvas-toolbar__item zoomin active" title="Zoom in"></div>
      <div (click)="onZoomOut.emit($event)" class="canvas-toolbar__item zoomout active" title="Zoom out"></div>
      <div (click)="onFit.emit($event)" class="canvas-toolbar__item fit active" title="Fit to editor"></div>
    </div>
  `
})
export class CanvasToolbarComponent implements OnDestroy {
  @Input() isEditable: boolean;
  @Output() onZoomIn = new EventEmitter<any>();
  @Output() onZoomOut = new EventEmitter<any>();
  @Output() onNewNode = new EventEmitter<any>();
  @Output() onFullScreen = new EventEmitter<any>();
  @Output() onFit = new EventEmitter<any>();

  @ViewChild('dragNode') dragNode: ElementRef;

  // The drag-ghost image (legacy: $('<div class="graph-node standard border-default">')).
  private ghost: HTMLElement = (() => {
    const el = document.createElement('div');
    el.className = 'graph-node standard border-default';
    return el;
  })();

  constructor(
    private dragAndDrop: DragAndDrop,
    @Inject('$rootScope') private $rootScope: any
  ) {}

  ngOnDestroy(): void {
    if (this.ghost.parentNode) {
      this.ghost.remove();
    }
  }

  onDragStart(event: DragEvent): void {
    const el = event.target as HTMLElement;
    if (!el || !el.draggable || !event.dataTransfer) {
      return;
    }
    // Ghost drag image (appended to body — appending to the toolbar left artifacts, per the legacy note).
    document.body.appendChild(this.ghost);
    event.dataTransfer.setDragImage(this.ghost, 0, 0);
    // Drag typing (folded in from the legacy `draggable` directive).
    event.dataTransfer.setData('elementId', el.id);
    event.dataTransfer.setData('droppable', 'true');
    event.dataTransfer.setData('draggableType', 'exact');
    event.dataTransfer.setData('draggableExactType', 'graphNode');
    this.dragAndDrop.drag(event, this.dragNode.nativeElement);
  }

  onDragEnd(event: DragEvent): void {
    if (this.ghost.parentNode) {
      this.ghost.remove();
    }
    this.$rootScope.$broadcast('Drag.END', event, this.dragNode.nativeElement);
  }
}
