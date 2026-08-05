/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Injectable } from '@angular/core';

declare const $: any; // jQuery, exposed as a global by webpack ProvidePlugin

// Phase C-1: migrated from common/services/mouse-event.service.js (pure leaf — no AngularJS DI,
// only browser + jQuery globals). Public surface (getWindowScroll/getEventOffsetOfElement/
// isModKeyDown) is unchanged; downgraded back into AngularJS DI as 'MouseEvent'.
@Injectable({ providedIn: 'root' })
export class MouseEvent {
  // Should we test other Apple OS'es? /Mac|iPod|iPhone|iPad/
  private readonly modKey = /Mac/.test(navigator.platform) ? 'metaKey' : 'ctrlKey';

  private getScale(element: any): number {
    const match = element.style.transform && element.style.transform.match(/scale\((\d+?(?:\.\d+?)?)\)/);
    if (match && match[1]) {
      return +match[1];
    }
    return 1;
  }

  getWindowScroll(event?: any): { x: number; y: number } {
    const supportPageOffset = window.pageXOffset !== undefined;
    const isCSS1Compat = (document.compatMode || '') === 'CSS1Compat';
    return {
      x: supportPageOffset ? window.pageXOffset : isCSS1Compat ? document.documentElement.scrollLeft : document.body.scrollLeft,
      y: supportPageOffset ? window.pageYOffset : isCSS1Compat ? document.documentElement.scrollTop : document.body.scrollTop
    };
  }

  getEventOffsetOfElement(event: any, element: any): { x: number; y: number } {
    const scroll = this.getWindowScroll(event);
    const scale = this.getScale(element);
    return {
      x: Math.round((event.clientX - scroll.x - element.getBoundingClientRect().left) / scale),
      // y: Math.round((event.clientY - scroll.y - element.getBoundingClientRect().top) / scale)
      y: Math.round((event.clientY + scroll.y - $(element).offset().top) / scale)
    };
  }

  isModKeyDown(event: any): boolean {
    return event[this.modKey];
  }
}
