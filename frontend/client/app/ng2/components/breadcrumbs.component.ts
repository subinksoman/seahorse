/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Component, Input, OnChanges } from '@angular/core';
import { LibraryService } from '../services/library.service';
import '../../workflows/library/breadcrumbs/breadcrumbs.less';

const MAX_PARENT_NUMBER_VISIBLE = 4;

// Phase C-2 (UI layer): migrated from workflows/library/breadcrumbs. Two @Input bindings
// (allParents/currentFolder); the legacy $scope.$watch(allParents) -> shortenParentsArray becomes
// ngOnChanges. Injects the Angular LibraryService directly. Template rewritten: ng-repeat -> *ngFor,
// ng-click -> (click), title={{}} -> [title]. Downgraded as directive 'breadcrumbs'; library-modal.html
// usage rebound to [allParents]/[currentFolder].
@Component({
  standalone: false,
  selector: 'breadcrumbs',
  template: `
    <div class="breadcrumbs">
      <div class="element parent-wrapper" *ngFor="let parent of parents">
        <div class="parent-elem text"
             (click)="goToParent(parent.uri)"
             [title]="parent.title">
          {{ parent.name }}
        </div>
        <div class="triangle-left">
          <div class="inner-triangle"></div>
        </div>
      </div>
      <div class="element current-wrapper" [title]="currentFolder">
        <div class="text">
          {{ currentFolder }}
        </div>
        <div class="triangle-left">
          <div class="inner-triangle"></div>
        </div>
      </div>
    </div>
  `
})
export class BreadcrumbsComponent implements OnChanges {
  @Input() allParents: any[] = [];
  @Input() currentFolder: string;
  parents: any[] = [];

  constructor(private LibraryService: LibraryService) {}

  ngOnChanges(): void {
    this.shortenParentsArray(this.allParents || []);
  }

  goToParent(uri: string): void {
    this.LibraryService.changeDirectory(uri);
  }

  shortenParentsArray(parents: any[]): void {
    if (parents.length > MAX_PARENT_NUMBER_VISIBLE) {
      const firstParentNotVisible = parents[parents.length - MAX_PARENT_NUMBER_VISIBLE];
      this.parents = [
        parents[0],
        {
          name: '...',
          uri: firstParentNotVisible.uri,
          title: firstParentNotVisible.name
        },
        ...parents.slice(parents.length - (MAX_PARENT_NUMBER_VISIBLE - 1), parents.length)
      ];
    } else {
      this.parents = [...parents];
    }
  }
}
