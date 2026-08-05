/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Component, Input, Inject, OnInit, AfterViewChecked, ViewChild, ElementRef } from '@angular/core';
import { LibraryModalService } from '../services/library-modal.service';
import { LibraryService } from '../services/library.service';
import '../workflows/library/recent-files-indicator/recent-files-indicator.less';

declare const jQuery: any; // global (expose-loader); malihu custom scrollbar plugin

// Phase C-2 (UI layer): migrated from workflows/library/recent-files-indicator. Embeds the Angular
// <file-list>. The popover-open + uploading-files $scope.$watch become bridged $rootScope.$watch on the
// (bound) LibraryModalService/LibraryService getters. The legacy `custom-scroll-bar` AngularJS directive
// (part of the shared deepsense module, used in 6 places — not migratable in isolation) is reimplemented
// INLINE here via mCustomScrollbar in ngAfterViewChecked, so this component doesn't depend on it.
// Downgraded as directive 'recentFilesIndicator'.
//
// NEEDS INTERACTIVE QA: open/close popover, live upload counter, scroll.
@Component({
  standalone: false,
  selector: 'recent-files-indicator',
  template: `
    <div class="recent-files-indicator">
      <div title="Recent uploads">
        <div class="btn-counter btn btn-grey"
             (click)="toggleOpenRecentFiles()"
             [ngClass]="{ 'indicator-disabled': allFiles.length === 0 }">
          <div class="gradient" *ngIf="uploadingFiles.length > 0"></div>
          <span class="sa sa-file files-counter-icon"></span>
          <span class="files-number">{{ allFiles.length }}</span>
        </div>
      </div>

      <div class="files-popover" *ngIf="recentFilesListOpen">
        <div class="popover-arrow"></div>
        <div class="popover-outer-arrow"></div>
        <div class="inner">
          <div class="cross" (click)="toggleOpenRecentFiles()">X</div>
          <div class="title">Recent uploads</div>
          <div class="files-wrapper" #filesWrapper>
            <file-list [mode]="'uploading-files'" [items]="allFiles" [onSelect]="onSelect"></file-list>
          </div>
        </div>
      </div>
    </div>
  `
})
export class RecentFilesIndicatorComponent implements OnInit, AfterViewChecked {
  @Input() onSelect: (item: any) => void;

  @ViewChild('filesWrapper') filesWrapper: ElementRef;

  recentFilesListOpen = false;
  uploadingFiles: any[] = [];
  uploadedFiles: any[] = [];
  allFiles: any[] = [];
  private scrollbarInited = false;

  constructor(
    @Inject('$rootScope') private $rootScope: any,
    private LibraryModalService: LibraryModalService,
    private LibraryService: LibraryService
  ) {}

  ngOnInit(): void {
    this.$rootScope.$watch(this.LibraryModalService.getUploadingFilesPopoverStatus, (newValue: boolean) => {
      this.recentFilesListOpen = newValue;
    });
    this.$rootScope.$watch(this.LibraryService.getUploadingFiles, (newValue: any[]) => {
      this.uploadingFiles = newValue.filter((value) => value.status === 'uploading');
      this.uploadedFiles = newValue.filter((value) => value.status === 'complete');
      this.allFiles = [...this.uploadingFiles, ...this.uploadedFiles];
    }, true);
  }

  ngAfterViewChecked(): void {
    // Init the custom scrollbar once the popover (and its .files-wrapper) is in the DOM.
    if (this.recentFilesListOpen && this.filesWrapper && !this.scrollbarInited) {
      jQuery(this.filesWrapper.nativeElement).mCustomScrollbar({ axis: 'y', theme: 'deepsense', scrollInertia: 300 });
      this.scrollbarInited = true;
    } else if (!this.recentFilesListOpen && this.scrollbarInited) {
      this.scrollbarInited = false;
    }
  }

  toggleOpenRecentFiles(): void {
    this.LibraryModalService.toggleUploadingFilesPopover();
  }
}
