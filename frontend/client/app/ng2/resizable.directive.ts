/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Directive, ElementRef, OnInit, OnDestroy, Inject } from '@angular/core';
import * as _ from 'lodash';

declare const jQuery: any;
declare const $: any;

// Phase C / editor-shell (router track, step 1): Angular ports of common/resizable/resizable.js +
// resizable-listener.js — the drag-to-resize panel dividers used ONLY in workflows-editor.html. The
// AngularJS originals stay registered (they serve the still-AngularJS editor template today); these
// Angular @Directives activate once workflows-editor.html becomes an Angular template (they don't
// collide — Angular directives apply only in Angular templates). Attributes are read off the host
// element (all static in the template); the Resizable.CHANGE / Resizable.FIT event bus stays on the
// bridged $rootScope so the two directives + any AngularJS listeners keep talking.

@Directive({ standalone: false, selector: '[resizable]' })
export class ResizableDirective implements OnInit, OnDestroy {
  private el: HTMLElement;
  private width: number;
  private height: number;
  private startPoint: { x?: number; y?: number } = {};
  private minAndStart: number;
  private resizeElement: any;
  private body: any;
  private deregisterFit: () => void;
  private boundMove = (e: any) => this.move(e);
  private boundMouseUp = (e: any) => this.onMouseUp(e);

  private tpl = _.template('<aside class="o-resizable o-resizable--' +
    '<%= position %> no-selection <% if (invisible) { %> o-resizable--invisible' +
    '<% } %>"></aside>');

  // was the bridged $document (angular.element(document)); $(document) is the identical jQuery wrapper.
  private $document: any = $(document);

  constructor(
    private elementRef: ElementRef,
    @Inject('$rootScope') private $rootScope: any
  ) {}

  private attr(name: string): string { return this.el.getAttribute(name); }

  ngOnInit(): void {
    this.el = this.elementRef.nativeElement;
    this.body = this.$document.find('body');
    this.minAndStart = Number(this.attr('resizable-min-start'));
    this.loadDimensions();
    this.renderDimensions();
    this.rest();
  }

  ngOnDestroy(): void {
    this.$document.off('mousemove', this.boundMove);
    this.$document.off('mouseup', this.boundMouseUp);
    if (this.deregisterFit) { this.deregisterFit(); }
  }

  private move(e: any): void {
    const diff = { x: e.clientX - this.startPoint.x, y: e.clientY - this.startPoint.y };
    let amount;
    switch (this.attr('resizable-position')) {
      case 'left':
        diff.x *= -1;
        amount = this.width + diff.x;
        this.el.style.width = `${amount}px`;
        this.triggerEvent(amount);
        break;
      case 'top':
        diff.y *= -1;
        amount = this.height + diff.y;
        if (amount < this.minAndStart) { amount = this.minAndStart; }
        this.el.style.height = `${amount}px`;
        this.triggerEvent(amount);
        break;
      // no default
    }
  }

  private triggerEvent(amount: number): void {
    const viaListener = this.attr('resizable-via-listener');
    if (viaListener) {
      this.$rootScope.$broadcast('Resizable.CHANGE', { selector: viaListener, amount });
    }
  }

  private loadDimensions(): void {
    const panelName = this.attr('resizable-panel-name');
    if (panelName && localStorage[panelName]) {
      try {
        const dimensions = JSON.parse(localStorage.getItem(panelName));
        if (dimensions.width) {
          this.el.style.width = `${dimensions.width}px`;
          this.triggerEvent(dimensions.width);
        }
        if (dimensions.height) {
          this.el.style.height = '25px';
          this.triggerEvent(25);
        }
      } catch (e) {
        /* eslint-disable no-console */
        console.log(e);
        /* eslint-enable no-console */
      }
    }
  }

  private saveDimensions(): void {
    const panelName = this.attr('resizable-panel-name');
    const position = this.attr('resizable-position');
    if (panelName) {
      if (position === 'left' && this.width) {
        localStorage.setItem(panelName, JSON.stringify({ width: this.width }));
      } else if (position === 'top' && this.height && this.height > 50) {
        localStorage.setItem(panelName, JSON.stringify({ height: this.height }));
      }
    }
  }

  private rest(): void {
    $(this.el).append(this.tpl({
      position: this.attr('resizable-position') || 'left',
      invisible: this.attr('resizable-invisible') === 'true'
    }));
    this.resizeElement = $(this.el).find('.o-resizable');

    this.resizeElement.on('mousedown', (e: any) => {
      this.startPoint.x = e.clientX;
      this.startPoint.y = e.clientY;
      this.$document.on('mousemove', this.boundMove);
      this.body.addClass('no-selection');
    });

    this.$document.on('mouseup', this.boundMouseUp);

    this.deregisterFit = this.$rootScope.$on('Resizable.FIT', (_e: any, data: any) => {
      this.$rootScope.$applyAsync(() => {
        if (data.name === 'height' && $(this.el).is(data.selector)) {
          (this.el.style as any)[data.name] = data.amount;
          this.height = parseInt(this.el.style.height, 10);
        }
      });
    });

    this.resizeElement.css(this.attr('resizable-position'), '+=' + this.attr('resizable-add-shift'));
  }

  private onMouseUp(e: any): void {
    this.startPoint.x = e.clientX;
    this.startPoint.y = e.clientY;
    this.width = parseInt(this.el.style.width, 10);
    this.height = parseInt(this.el.style.height, 10);
    this.renderDimensions();
    this.$document.off('mousemove', this.boundMove);
    this.body.removeClass('no-selection');
    this.saveDimensions();
  }

  private renderDimensions(): void {
    if (!this.width) { this.width = jQuery(this.el).outerWidth(true); }
    if (!this.height) { this.height = this.minAndStart || jQuery(this.el).outerHeight(true); }
  }
}

@Directive({ standalone: false, selector: '[resizable-listener]' })
export class ResizableListenerDirective implements OnInit, OnDestroy {
  private el: HTMLElement;
  private deregister: () => void;

  constructor(
    private elementRef: ElementRef,
    @Inject('$rootScope') private $rootScope: any
  ) {}

  ngOnInit(): void {
    this.el = this.elementRef.nativeElement;
    const mode = this.el.getAttribute('resizable-listener');
    this.deregister = this.$rootScope.$on('Resizable.CHANGE', (_e: any, data: any) => {
      if (this.el.matches(data.selector)) {
        if (mode === 'height') { this.changeHeight(data.amount); }
        // changeWidth was a no-op in the original.
      }
    });
  }

  ngOnDestroy(): void {
    if (this.deregister) { this.deregister(); }
  }

  private changeHeight(amount: any): void {
    if (typeof amount !== 'string') { amount = amount + 'px'; }
    this.el.style.height = `calc(100% - ${amount})`;
  }
}
