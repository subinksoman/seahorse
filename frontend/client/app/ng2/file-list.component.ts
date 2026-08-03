/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Component, Input, Inject, OnInit, OnChanges } from '@angular/core';
import { LibraryModalService } from './library-modal.service';
import '../workflows/library/file-list/file-list.less';

// Phase C-2 (UI layer): migrated from workflows/library/file-list. Embeds the Angular <file-element>.
// The legacy `items | orderBy:['kind','name']` filter is replaced by pre-sorting into sortedItems (no
// AngularJS filter needed). The new-directory-visibility and parents $scope.$watch become bridged
// $rootScope.$watch. Injects the Angular LibraryModalService. Downgraded as directive 'fileList'.
@Component({
  selector: 'file-list',
  template: `
    <div class="file-list">
      <file-element *ngIf="parent" [item]="parent" [isLast]="false"></file-element>
      <file-element *ngIf="newDir && mode === 'editable'" [item]="newDirItem"></file-element>
      <file-element *ngFor="let item of sortedItems; let last = last"
                    [item]="item" [isLast]="last" [onSelect]="onSelect"></file-element>
    </div>
  `
})
export class FileListComponent implements OnInit, OnChanges {
  @Input() items: any[] = [];
  @Input() parents: any[];
  @Input() onSelect: (item: any) => void;
  @Input() mode = 'editable';

  sortedItems: any[] = [];
  parent: any = null;
  newDir = false;
  newDirItem: any = { kind: 'newDir' };

  constructor(
    @Inject('$rootScope') private $rootScope: any,
    private LibraryModalService: LibraryModalService
  ) {}

  ngOnInit(): void {
    this.$rootScope.$watch(() => this.LibraryModalService.getNewDirectoryInputVisibility(), (newValue: boolean) => {
      this.newDir = newValue;
      this.newDirItem = { kind: 'newDir' };
    });
    this.$rootScope.$watch(() => this.parents, (parents: any[]) => {
      if (parents && parents.length > 0) {
        const lastParent = parents[parents.length - 1];
        this.parent = { name: '..', uri: lastParent.uri, kind: 'parent' };
      } else {
        this.parent = null;
      }
    });
  }

  ngOnChanges(): void {
    this.sortedItems = this.sortItems(this.items || []);
  }

  // Reproduces AngularJS `orderBy:['kind','name']`.
  private sortItems(items: any[]): any[] {
    return [...items].sort((a, b) => {
      const ka = a.kind || '', kb = b.kind || '';
      if (ka !== kb) { return ka < kb ? -1 : 1; }
      const na = a.name || '', nb = b.name || '';
      return na < nb ? -1 : (na > nb ? 1 : 0);
    });
  }
}
