/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Injectable, Inject } from '@angular/core';
import _ from 'lodash';

declare const $: any; // jQuery (global)

// Phase C / AngularJS removal (engine cluster): native port of editor/core-canvas/canvas.service.js.
// Drives the canvas sliding-window: zoom/pan/fit + screen<->canvas coordinate maths, delegating the
// jsPlumb work to AdapterService (still AngularJS — bridged). All live consumers are ng2 (core-canvas /
// canvas-toolbar / editor / workflows-editor / node-copy-paste), so it's aliased to the class in
// bootstrap.ts (no downgrade needed — the AngularJS consumers are dead). $rootScope + AdapterService are
// bridged. jQuery ($) is a global.

const NODE_WIDTH = 160;
const NODE_HEIGHT = 60;
const OFFSET = 30;
const POSITION_BOUNDS = { X: [-10000, 0], Y: [-10000, 0] };
const ZOOM_BOUNDS: [number, number] = [0.5, 1.5];

@Injectable({ providedIn: 'root' })
export class CanvasService {
  slidingWindowSize = { width: 0, height: 0 };
  slidingWindowPosition = { x: 0, y: 0 };
  scale = 1;
  nodes: any;
  private $slidingWindow: any;

  constructor(
    @Inject('AdapterService') private AdapterService: any,
    @Inject('$rootScope') private $rootScope: any
  ) {}

  initialize(jsPlumbContainer: any, slidingWindow: any): void {
    this.$slidingWindow = $(slidingWindow);
    this.AdapterService.initialize(jsPlumbContainer);

    this.$rootScope.$watch(() => this.getWindowSize(), (newValue: any, oldValue: any) => {
      if (newValue !== oldValue) {
        this.fit();
        this.slidingWindowSize = this.getWindowSize();
      }
    }, true); // deep

    this.setZoom(1);
    this.applyToWindow();
  }

  getWindowSize(): { width: number; height: number } {
    return { width: this.$slidingWindow.width(), height: this.$slidingWindow.height() };
  }

  applyToWindow(animateTime = 0): void {
    this.$slidingWindow.css({
      transition: `transform ${animateTime}s`,
      transform: `translate(${this.slidingWindowPosition.x}px, ${this.slidingWindowPosition.y}px) scale(${this.scale})`
    });
  }

  setZoom(zoom: number): void {
    this.scale = _.clamp(zoom, ZOOM_BOUNDS[0], ZOOM_BOUNDS[1]);
    this.AdapterService.setZoom(this.scale);
  }

  setPosition(position: { x: number; y: number }, animateTime?: number): void {
    const newPosition = {
      x: _.clamp(position.x, POSITION_BOUNDS.X[0] * this.scale + this.slidingWindowSize.width, POSITION_BOUNDS.X[1]),
      y: _.clamp(position.y, POSITION_BOUNDS.Y[0] * this.scale + this.slidingWindowSize.height, POSITION_BOUNDS.Y[1])
    };
    this.slidingWindowPosition = newPosition;
    this.applyToWindow(animateTime);
  }

  setWorkflow(workflow: any): void {
    this.nodes = workflow.getNodes();
    this.AdapterService.setWorkflow(workflow);
  }

  setEditable(isEditable: boolean): void {
    this.AdapterService.isEditable = isEditable;
  }

  render(): void {
    this.AdapterService.setZoom(this.scale);
    this.AdapterService.render();
  }

  moveWindow(x = 0, y = 0, animateTime?: number): void {
    this.setPosition({ x: this.slidingWindowPosition.x + x, y: this.slidingWindowPosition.y + y }, animateTime);
  }

  fit(): void {
    if (!this.$slidingWindow) { return; }
    this.slidingWindowSize = this.getWindowSize();
    const boundaries = { left: Infinity, top: 0, right: 0, bottom: Infinity };
    Object.keys(this.nodes).forEach((key) => {
      boundaries.left = Math.min(boundaries.left, this.nodes[key].x);
      boundaries.right = Math.max(boundaries.right, this.nodes[key].x + NODE_WIDTH);
      boundaries.top = Math.max(boundaries.top, this.nodes[key].y + NODE_HEIGHT);
      boundaries.bottom = Math.min(boundaries.bottom, this.nodes[key].y);
    });
    this.setZoom(Math.min(
      (this.slidingWindowSize.width - OFFSET) / (boundaries.right - boundaries.left),
      (this.slidingWindowSize.height - OFFSET) / (boundaries.top - boundaries.bottom)
    ));
    this.setPosition({
      x: -this.scale * ((boundaries.left + boundaries.right) / 2) + (this.slidingWindowSize.width) / 2,
      y: -this.scale * ((boundaries.top + boundaries.bottom) / 2) + (this.slidingWindowSize.height) / 2
    });
  }

  zoomToPosition(zoomDelta: number, posX: number, posY: number): void {
    const initialScale = this.scale;
    this.setZoom(this.scale + zoomDelta);
    const ratio = this.scale / initialScale;
    this.setPosition({
      x: posX - (posX - this.slidingWindowPosition.x) * ratio,
      y: posY - (posY - this.slidingWindowPosition.y) * ratio
    });
  }

  centerZoom(zoomDelta: number): void {
    this.zoomToPosition(zoomDelta, this.slidingWindowSize.width / 2, this.slidingWindowSize.height / 2);
  }

  translateScreenToCanvasPosition(x: number, y: number): [number, number] {
    return [
      (-this.slidingWindowPosition.x + x) / this.scale,
      (-this.slidingWindowPosition.y + y) / this.scale
    ];
  }
}
