/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Directive, Input, ElementRef, OnChanges, SimpleChanges } from '@angular/core';

// Phase C / Lane A (shared utility directives): Angular version of common/focusElement/focus-element.js, for
// use inside migrated (Angular) panel templates. When the bound expression becomes true, focus the host
// element (legacy scope.$watch(attrs.focusElement) -> ngOnChanges). The AngularJS directive stays registered
// for the AngularJS templates that still use it; the same selector does not collide across frameworks.
@Directive({ standalone: false, selector: '[focus-element]' })
export class FocusElementDirective implements OnChanges {
  // eslint-disable-next-line @angular-eslint/no-input-rename — alias matches the legacy attribute name.
  @Input('focus-element') focusElement: any;

  constructor(private host: ElementRef) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.focusElement && changes.focusElement.currentValue === true) {
      this.host.nativeElement.focus();
    }
  }
}
