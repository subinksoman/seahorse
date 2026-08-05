/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import {
  Component, Input, Output, EventEmitter, ElementRef, ViewChild, AfterViewInit, HostListener
} from '@angular/core';
import '../workflows/editor/new-node/new-node.less';

// Phase C / canvas: migrated from workflows/editor/new-node. The search-box + operation-catalogue popover
// used to create a node. Downgraded as directive 'newNode'; its usage in editor.html is transcluded into
// core-canvas and carries the sibling AngularJS `jsplumb-draggable` directive on the host (composes with
// the downgraded component, like graph-node). Rebinds to Angular syntax there.
//  - Legacy `focused="500"` directive on the input -> inline ViewChild focus after 500ms (no shared dir dep).
//  - ng-model -> [value]/(input) (no @angular/forms dependency, keeps the audit surface flat).
//  - $postLink mousedown/click stopPropagation -> @HostListener; the $timeout rect emit -> ngAfterViewInit.
//  - The two `&` outputs (onSelect / onDisplayRectChange) -> @Outputs; it hosts the migrated
//    <operation-catalogue> (Angular) directly.
@Component({
  standalone: false,
  selector: 'new-node',
  template: `
    <div class="new-node__input-container">
      <input #searchInput class="new-node__input"
             [value]="operationSearchQuery"
             (input)="onQueryInput($event)" />
    </div>
    <operation-catalogue
      class="new-node__catalogue"
      [query]="operationSearchQuery"
      (selectOperation)="onSelect.emit($event)"
      [containment]="containment"
      [categories]="categories"
    ></operation-catalogue>
  `
})
export class NewNodeComponent implements AfterViewInit {
  @Input() categories: any;
  @Input() containment: any;
  @Input() data: any;
  @Output() onDisplayRectChange = new EventEmitter<any>();
  @Output() onSelect = new EventEmitter<any>();

  @ViewChild('searchInput') searchInput: ElementRef;
  operationSearchQuery = '';

  constructor(private host: ElementRef) {}

  ngAfterViewInit(): void {
    // Legacy `focused="500"`: focus the search input after 500ms.
    setTimeout(() => {
      if (this.searchInput) {
        this.searchInput.nativeElement.focus();
      }
    }, 500);
    // Legacy $postLink: emit the host's bounding rect so the editor can keep the palette on-screen.
    setTimeout(() => {
      const { top, left, right, bottom } = this.host.nativeElement.getBoundingClientRect();
      this.onDisplayRectChange.emit({ top, left, right, bottom });
    }, 0);
  }

  @HostListener('mousedown', ['$event'])
  @HostListener('click', ['$event'])
  stop(event: Event): void {
    event.stopPropagation();
  }

  onQueryInput(event: Event): void {
    this.operationSearchQuery = (event.target as HTMLInputElement).value;
  }
}
