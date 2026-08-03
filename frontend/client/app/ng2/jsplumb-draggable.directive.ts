/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Directive, Input, Inject, ElementRef, AfterViewInit } from '@angular/core';
import jsPlumb from 'jsplumb';

// Phase C / canvas: Angular version of workflows/common-behaviours/common-jsplumb-draggable.js, for use on
// the graph-node elements inside the migrated (Angular) core-canvas template. Makes the host jsPlumb-draggable
// and writes the dropped position back onto the node. The [node] the directive needs is the same object bound
// to the graph-node component; it is passed to the directive too. The AngularJS directive stays registered
// (editor.html's new-node still uses it), and the same selector in the two frameworks does not collide.
@Directive({ standalone: false, selector: '[jsplumb-draggable]' })
export class JsplumbDraggableDirective implements AfterViewInit {
  @Input() node: any;

  constructor(
    private host: ElementRef,
    @Inject('$rootScope') private $rootScope: any,
    @Inject('GraphNode') private GraphNode: any
  ) {}

  ngAfterViewInit(): void {
    const element = this.host.nativeElement;
    const reInit = () => {
      if (this.node) {
        this.node.x = parseInt(element.style.left, 10);
        this.node.y = parseInt(element.style.top, 10);
      }
    };
    jsPlumb.draggable(element, {
      containment: 'parent',
      stop: () => {
        reInit();
        this.$rootScope.$broadcast(this.GraphNode.MOVE);
      }
    });
    // Legacy listened for MultipleSelection.STOP_DRAG to re-read positions; mirror on the bridged $rootScope.
    this.$rootScope.$on('MultipleSelection.STOP_DRAG', reInit);
  }
}
