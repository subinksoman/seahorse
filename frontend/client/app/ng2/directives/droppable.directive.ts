/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Directive, ElementRef, Input, HostListener } from '@angular/core';
import { DragAndDrop } from '../services/drag-and-drop.service';

declare const jQuery: any;

// Phase C / bootstrap inversion (THE FLIP): native port of workflows/common-behaviours/common-droppable.js
// (the AngularJS `droppable` attribute directive) — the last common-behaviour still on AngularJS. Applied
// to the app-root frame (droppable-type="frame") to accept drops routed through the native DragAndDrop
// service. dragover/dragenter allow the drop; on drop, if the payload matches this element's droppable
// type, DragAndDrop.drop() handles it. The element is passed jQuery-wrapped (DragAndDrop.drop uses
// element[0] / .css() / .attr()), matching the jqLite element the AngularJS directive handed over.
@Directive({ standalone: false, selector: '[droppable]' })
export class DroppableDirective {
  @Input('droppable-type') droppableType: string;

  constructor(private el: ElementRef, private dragAndDrop: DragAndDrop) {}

  @HostListener('dragover', ['$event'])
  onDragOver(event: any): boolean {
    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.dropEffect = 'copy';
    event.preventDefault();
    return false;
  }

  @HostListener('dragenter', ['$event'])
  onDragEnter(event: any): boolean {
    event.preventDefault();
    return false;
  }

  @HostListener('drop', ['$event'])
  onDrop(event: any): boolean | void {
    if (!this.droppableType) { return false; }
    if (
      event.dataTransfer.getData('droppable') === 'true' &&
      event.dataTransfer.getData('draggableType') === this.droppableType
    ) {
      event.stopImmediatePropagation();
      this.dragAndDrop.drop(event, jQuery(this.el.nativeElement));
      event.preventDefault();
      return false;
    }
  }
}
