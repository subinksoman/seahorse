/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Component, OnInit, DoCheck, Inject } from '@angular/core';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { LibraryService } from './library.service';
import { DeleteModalService } from './delete-modal.service';

const COOKIE_NAME = 'DELETE_DATAFRAME_COOKIE';
const TITLE_MAP: { [k: string]: string } = {
  'read-file': 'Select data frame',
  'write-to-file': 'Write data frame'
};

// Phase C / AngularJS removal: the library file picker on CDK/ModalService (was workflows/library/
// library-modal + LibraryModalCtrl). Hosts the already-Angular browser (breadcrumbs / file-list /
// recent-files-indicator, camelCase inputs now) + the UpgradeComponent-wrapped <file-upload-section>.
// The two $scope.$watch (dir content, filter) -> ngDoCheck. Fixes the "backside peek": the CDK backdrop
// (z-index 1100) now covers the still-uib datasource dialog behind it. onSelect closes (read-file) or
// fills the name (write-to-file); ok() closes with the composed library:// uri.
@Component({
  standalone: false,
  template: `
    <div class="modal-content">
      <div class="dataframe-library-modal"
           [ngClass]="{'read-mode': mode === 'read-file', 'write-mode': mode === 'write-to-file'}">
        <div class="modal-header dataframe-library-modal__header">
          <div class="title">{{ title }}</div>
          <div class="input">
            <input class="form-control search-field" [value]="filterString"
                   (input)="filterString = $any($event.target).value"
                   [placeholder]="'Search in ' + (currentDirName || 'library')"/>
            <span class="clear-search" (click)="clearSearchInput()" *ngIf="filterString">X</span>
          </div>
        </div>

        <breadcrumbs [allParents]="parents" [currentFolder]="currentDirName"></breadcrumbs>

        <div class="dataframe-library-modal__body">
          <div class="content-wrapper">
            <div class="files-list">
              <div class="dataframe-form">
                <button class="btn btn-grey add-folder" type="button" (click)="showNewDirectoryInput()">
                  <i class="sa sa-directory add-folder__icon"></i>
                  <span class="add-folder__label">New</span>
                </button>
                <file-upload-section style="flex: 1;"></file-upload-section>
                <recent-files-indicator [onSelect]="onSelect"></recent-files-indicator>
              </div>

              <deepsense-loading-spinner-sm *ngIf="loading"></deepsense-loading-spinner-sm>

              <div class="file-list-wrapper" custom-scroll-bar>
                <file-list [items]="items" [parents]="parents" [onSelect]="onSelect"></file-list>
              </div>

              <div *ngIf="message" class="dataframe-info">{{ message }}</div>
            </div>
          </div>
        </div>

        <div class="dataframe-library-modal__footer">
          <input *ngIf="mode === 'write-to-file'" [value]="selectedItem"
                 (input)="selectedItem = $any($event.target).value"
                 class="file-input" type="text" placeholder="Name your file">
          <button *ngIf="mode === 'write-to-file'" type="button" (click)="ok()"
                  [disabled]="!selectedItem" class="btn btn-blue">Ok</button>
          <button type="button" class="btn btn-white" (click)="close()">Close</button>
        </div>
      </div>
    </div>
  `
})
export class LibraryModalComponent implements OnInit, DoCheck {
  mode: string;
  private params: any;
  title: string;
  loading = true;
  filterString = '';
  selectedItem = '';
  message: string;
  items: any;
  parents: any;
  currentDirName: string;
  currentDirUri: string;
  private _prevFilter = '';

  constructor(
    @Inject(DIALOG_DATA) data: any,
    private dialogRef: DialogRef<any>,
    private libraryService: LibraryService,
    @Inject('LibraryModalService') private libraryModalService: any,
    private deleteModalService: DeleteModalService
  ) {
    this.mode = data && data.mode;
    this.params = data && data.params;
    this.title = TITLE_MAP[this.mode] || 'Library';
  }

  ngOnInit(): void {
    (this.libraryService as any).fetchAll().then(() => {
      this.loading = false;
      this.handleDeeplink(this.params);
    }).catch(() => {
      this.loading = false;
      this.message = 'There was an error during downloading list of files.';
    });
  }

  ngDoCheck(): void {
    this.handleResults((this.libraryService as any).getCurrentDirectory());
    if (this.filterString !== this._prevFilter) {
      this._prevFilter = this.filterString;
      (this.libraryService as any).setFilter(this.filterString);
    }
  }

  onSelect = (item: any): void => {
    if (this.mode === 'read-file') {
      this.dialogRef.close(item);
    } else if (this.mode === 'write-to-file') {
      this.selectedItem = item.name;
    }
  };

  private handleDeeplink(param: any): void {
    const test = /(library:\/\/)(.*)/.exec(param);
    if (test && test.length > 1) {
      const pathElements = test[2].split('/');
      const file = pathElements.slice(-1);
      const uri = test[1] + pathElements.slice(0, -1).join('/');
      this.selectedItem = file as any;
      (this.libraryService as any).changeDirectory(uri);
    }
  }

  deleteFile(file: any): void {
    (this.deleteModalService as any).handleDelete(() => {
      (this.libraryService as any).removeFile(file).then(() => {
        (this.libraryService as any).removeUploadingFile(file);
      });
    }, COOKIE_NAME);
  }

  clearSearchInput(): void { this.filterString = ''; }

  showNewDirectoryInput(): void {
    if (!this.libraryModalService.getUploadingFilesPopoverStatus()) {
      this.libraryModalService.showNewDirectoryInput();
    }
  }

  close(): void { this.dialogRef.close(undefined); }

  ok(): void {
    this.dialogRef.close(`${this.currentDirUri}/${this.selectedItem}`.replace('///', '//'));
  }

  private handleResults(result: any): void {
    if (!result) { return; }
    this.items = result.items;
    this.parents = result.parents;
    this.currentDirName = result.name;
    this.currentDirUri = result.uri;
  }
}
