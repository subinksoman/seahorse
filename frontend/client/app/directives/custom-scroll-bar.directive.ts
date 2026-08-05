/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Directive, ElementRef, AfterViewInit } from '@angular/core';

// jQuery (with the malihu mCustomScrollbar plugin from libs.js) is provided globally by webpack.
declare const jQuery: any;

// Phase C / Lane A (shared utility directives): Angular version of common/custom-scrollbar/
// common-custom-scrollbar.js, for use inside migrated (Angular) panel templates (general-data-panel,
// deepsense attributes/catalogue panels). Initialises the mCustomScrollbar on the host in ngAfterViewInit
// (legacy directive link). The AngularJS directive stays registered for the AngularJS templates that still
// use it (workflows-editor.html, library-modal.html); the same selector does not collide across frameworks.
@Directive({ standalone: false, selector: '[custom-scroll-bar]' })
export class CustomScrollBarDirective implements AfterViewInit {
  constructor(private host: ElementRef) {}

  ngAfterViewInit(): void {
    jQuery(this.host.nativeElement).mCustomScrollbar({
      axis: 'y',
      theme: 'deepsense',
      advanced: { autoScrollOnFocus: false },
      scrollInertia: 300
    });
  }
}
