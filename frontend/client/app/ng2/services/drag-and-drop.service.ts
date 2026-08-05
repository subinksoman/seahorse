/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Injectable, Inject } from '@angular/core';
import { MouseEvent } from './mouse-event.service';

// Phase C-1: migrated from workflows/common-behaviours/common-drag-and-drop.service.js. Handles the
// drag/drop of graph frames + palette items, broadcasting Drag.START/Drop.DROP/Drop.EXACT on the
// (bridged) $rootScope. Notably injects the already-migrated Angular MouseEvent service DIRECTLY as
// an Angular class (bottom-up migration win). The legacy `internal` closure state becomes instance
// fields (root singleton, identical semantics). Downgraded as 'DragAndDrop'.
@Injectable({ providedIn: 'root' })
export class DragAndDrop {
  private allDraggableElements = new WeakMap<any, any>();
  private draggableElement: any = {};
  private readonly states = {
    default: 'default',
    displaced: 'displaced'
  };

  constructor(
    @Inject('$rootScope') private $rootScope: any,
    private mouseEvent: MouseEvent
  ) {}

  drag(event: any, element: any): void {
    const type = event.dataTransfer.getData('draggableType');

    this.setCurrentElement(element);

    switch (type) {
      case 'frame':
        this.saveFrameElementData(event, element);
        break;
      case 'exact':
        this.saveExactElementData(event, element);
        break;
      default:
        console.error('Unknown type %s', type);
    }

    this.$rootScope.$broadcast('Drag.START', event, element);
  }

  drop(event: any, element: any): void {
    const type = event.dataTransfer.getData('draggableType');

    switch (type) {
      case 'frame':
        this.handleFrameMovement(event, element);
        break;
      case 'exact':
        this.publishExactEvent(event, this.draggableElement.element);
        break;
      default:
        console.error('Unknown type %s', type);
    }

    this.$rootScope.$broadcast('Drop.DROP', event, element);
  }

  private saveFrameElementData(event: any, element: any): void {
    const containerStartEventCoordinates =
      this.mouseEvent.getEventOffsetOfElement(event, element[0]);

    this.draggableElement.element = element;
    this.draggableElement.eventPosition =
      this.draggableElement.eventPosition || {
        x: event.pageX,
        y: event.pageY
      };

    /* first drag */
    if (!this.draggableElement.containerStartEventCoordinates) {
      this.draggableElement.containerStartEventCoordinates =
        containerStartEventCoordinates;
    }

    /* set correct point of drag based on old point */
    this.draggableElement.eventPosition.x +=
      containerStartEventCoordinates.x -
      this.draggableElement.containerStartEventCoordinates.x;

    this.draggableElement.eventPosition.y +=
      containerStartEventCoordinates.y -
      this.draggableElement.containerStartEventCoordinates.y;

    /* save new point of drag as old */
    this.draggableElement.containerStartEventCoordinates =
      containerStartEventCoordinates;
  }

  private saveExactElementData(event: any, element: any): void {
    this.draggableElement.element = element;
    this.draggableElement.exactType =
      event.dataTransfer.getData('draggableExactType');
  }

  private handleFrameMovement(event: any, element: any): void {
    this.draggableElement.element
      .css('transform', `translate(
        ${event.pageX - this.draggableElement.eventPosition.x}px,
        ${event.pageY - this.draggableElement.eventPosition.y}px
      )`);

    // TODO return to default place
    this.draggableElement.element
      .attr('data-drag-state', this.states.displaced);
  }

  private publishExactEvent(event: any, element: any): void {
    this.$rootScope.$broadcast('Drop.EXACT',
      event, element, this.draggableElement.exactType);
  }

  private setCurrentElement(key: any): void {
    const draggableElementFromList = this.allDraggableElements.get(key);

    if (draggableElementFromList) {
      this.draggableElement = draggableElementFromList;
    } else {
      this.draggableElement = {};
      this.allDraggableElements.set(key, this.draggableElement);
    }
  }
}
