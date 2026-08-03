/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Component, Input, Inject, OnInit, OnChanges, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { DeleteModalService } from './delete-modal.service';
import { LibraryModalService } from './library-modal.service';
import { LibraryService } from './library.service';
import '../workflows/library/file-list/file-element/file-element.less';

const COOKIE_NAME = 'DELETE_DATAFRAME_COOKIE';
const VISIBLE_PARENTS_COUNT = 2;
const ESC_CODE = 27;
const ENTER_CODE = 13;

// Phase C-2 (UI layer): migrated from workflows/library/file-list/file-element. The legacy component
// used ng-include over 4 sub-templates (file/directory/parent/newDir); here they are inlined into an
// *ngSwitch on item.kind. Reactivity on the current directory/filter (legacy $scope.$watchGroup) uses
// the bridged $rootScope.$watchGroup (the app's AngularJS digest still drives the hybrid). The
// new-directory input uses manual [value]/(input) binding (no FormsModule dependency) + a ViewChild
// focus instead of the AngularJS `focused` directive. Injects the Angular DeleteModal/LibraryModal/
// Library services directly.
// Downgraded as directive 'fileElement'.
//
// NEEDS INTERACTIVE QA: navigate/download/delete/new-directory-create + upload-progress rendering.
@Component({
  standalone: false,
  selector: 'file-element',
  template: `
   <ng-container [ngSwitch]="item?.kind">
    <!-- file -->
    <div *ngSwitchCase="'file'" class="file-element"
         [ngClass]="{ 'last-elem': isLast, 'upload-error': item.status === 'error' }">
      <div class="icon-wrapper">
        <div class="icon sa sa-file"></div>
        <div class="extension" [ngClass]="canShowExtension ? extension : ''" *ngIf="canShowExtension">
          {{ extension }}
        </div>
      </div>
      <div class="name-section" (click)="onSelect && onSelect(item)">
        <div class="name" [title]="item.name">{{ item.name }}</div>
        <div class="upload-info" *ngIf="(item.progress && item.status !== 'error') || isFiltered">
          <div class="parent" *ngFor="let parent of parents; let first = first; let last = last">
            <div *ngIf="first">in</div>
            <div class="parent-name" (click)="goToUri(parent.uri)" [title]="parent.title">{{ parent.name }}</div>
            <div *ngIf="!last">/</div>
          </div>
        </div>
        <div class="upload-info" *ngIf="item.progress && item.status === 'error'">(upload failed)</div>
      </div>
      <div class="actions" [ngClass]="{ 'disabled': item.progress > 0 && item.progress < 100 }">
        <span class="sa sa-directory" title="Open directory" (click)="goToUri(item.parent.uri)" *ngIf="item.progress"></span>
        <a [href]="item.downloadUrl" download><span class="sa sa-download"></span></a>
        <span class="sa sa-delete" (click)="deleteFile(item)"></span>
      </div>
      <div class="file-element-progress-upload"
           *ngIf="item.progress > 0 && item.progress < 100"
           [style.width.%]="item.progress"></div>
    </div>

    <!-- directory -->
    <div *ngSwitchCase="'directory'" class="file-element directory" [ngClass]="{ 'last-elem': isLast }">
      <div class="icon-wrapper"><div class="icon sa sa-directory"></div></div>
      <div class="name-section" (click)="goToUri(item.uri)">
        <div class="name" [title]="item.name">{{ item.name }}</div>
        <div class="upload-info" *ngIf="isFiltered">
          <div class="parent" *ngFor="let parent of parents; let first = first; let last = last">
            <div *ngIf="first">in</div>
            <div class="parent-name" (click)="goToUri(parent.uri)" [title]="parent.title">{{ parent.name }}</div>
            <div *ngIf="!last">/</div>
          </div>
        </div>
      </div>
      <div class="actions"><span class="sa sa-delete" (click)="deleteDirectory(item)"></span></div>
    </div>

    <!-- parent (..) -->
    <div *ngSwitchCase="'parent'" class="file-element directory" [ngClass]="{ 'last-elem': isLast }">
      <div class="icon-wrapper"><div class="icon sa sa-directory-parent"></div></div>
      <div class="name-section" (click)="goToUri(item.uri)">
        <div class="name">{{ item.name }}</div>
      </div>
    </div>

    <!-- new directory input -->
    <div *ngSwitchCase="'newDir'" class="file-element directory" [ngClass]="{ 'last-elem': false }">
      <div class="icon-wrapper"><div class="icon sa sa-directory"></div></div>
      <div class="name-section">
        <input #newDirInput class="new-directory__input"
               [value]="newDirectoryName"
               (input)="newDirectoryName = $event.target.value"
               (keydown)="onKeyDownHandler($event)"
               maxlength="30" />
        <span class="new-directory__ok"
              [ngClass]="{ 'disabled': newDirectoryName === '' || isDirectoryNameUsed() }"
              (click)="saveNewDir()">Ok</span>
        <span class="new-directory__cancel" (click)="cancelAddingNewDir()">Cancel</span>
        <span class="new-directory__exists" *ngIf="isDirectoryNameUsed()">Directory with this name already exists</span>
      </div>
    </div>
   </ng-container>
  `
})
export class FileElementComponent implements OnInit, OnChanges, AfterViewInit {
  @Input() item: any;
  @Input() isLast: boolean;
  @Input() onSelect: (item: any) => void;

  @ViewChild('newDirInput') newDirInput: ElementRef;

  isFiltered: boolean;
  parents: any[] = [];
  extension: string;
  canShowExtension: boolean;
  newDirectoryName = '';

  constructor(
    @Inject('$rootScope') private $rootScope: any,
    private DeleteModalService: DeleteModalService,
    private LibraryModalService: LibraryModalService,
    private LibraryService: LibraryService
  ) {}

  ngOnInit(): void {
    this.$rootScope.$watchGroup([
      () => this.LibraryService.getCurrentDirectory().path,
      () => this.LibraryService.getCurrentDirectory().isFiltered()
    ], (newValues: any[]) => {
      this.isFiltered = newValues[1];
      if (this.isFiltered && this.item.parents) {
        this.formatParentsForFilteredResource();
      }
    });
  }

  ngOnChanges(): void {
    if (!this.item) { return; }
    this.extension = this.getExtension(this.item.name);
    this.canShowExtension = this.extension === 'json' || this.extension === 'csv';
    if (this.item.parents && this.item.progress) {
      this.formatParentsForUploadedFile();
    }
  }

  ngAfterViewInit(): void {
    if (this.item && this.item.kind === 'newDir' && this.newDirInput) {
      setTimeout(() => this.newDirInput.nativeElement.focus());
    }
  }

  onKeyDownHandler(event: any): void {
    const keyCode = event.keyCode;
    if (keyCode === ESC_CODE) {
      event.preventDefault();
      this.LibraryModalService.hideNewDirectoryInput();
    } else if (keyCode === ENTER_CODE && (this.newDirectoryName !== '' && !this.isDirectoryNameUsed())) {
      this.saveNewDir();
    }
  }

  isDirectoryNameUsed(): boolean {
    return this.LibraryService.getCurrentDirectory().containsDirectory(this.newDirectoryName);
  }

  getExtension(fileName: string): string {
    if (!fileName) { return ''; }
    return fileName.split('.').pop().toLowerCase();
  }

  formatParentsForUploadedFile(): void {
    const parents = this.item.parents.slice(1);
    this.parents = this.getVisibleParents(parents);
  }

  formatParentsForFilteredResource(): void {
    const currentDirectory = this.LibraryService.getCurrentDirectory();
    if (currentDirectory.isFiltered()) {
      const parents = this.item.parents.slice(this.item.parents.indexOf(currentDirectory.directory) + 1);
      this.parents = this.getVisibleParents(parents);
    }
  }

  getVisibleParents(parents: any[]): any[] {
    const visibleParents = parents.slice(-(VISIBLE_PARENTS_COUNT + 1));
    if (parents.length > VISIBLE_PARENTS_COUNT) {
      visibleParents[0] = { name: '...', title: visibleParents[0].name, uri: visibleParents[0].uri };
    }
    return visibleParents;
  }

  goToUri(uri: string): void {
    this.cancelAddingNewDir();
    this.LibraryModalService.closeUploadingFilesPopover();
    this.LibraryService.changeDirectory(uri);
  }

  deleteFile(file: any): void {
    this.DeleteModalService.handleDelete(() => {
      this.LibraryService.removeFile(file).then(() => {
        this.LibraryService.removeUploadingFile(file);
      });
    }, COOKIE_NAME);
  }

  deleteDirectory(directory: any): void {
    this.DeleteModalService.handleDelete(() => {
      this.LibraryService.removeDirectory(directory);
    }, COOKIE_NAME);
  }

  saveNewDir(): void {
    this.LibraryService.addDirectory(this.newDirectoryName);
    this.LibraryModalService.hideNewDirectoryInput();
  }

  cancelAddingNewDir(): void {
    this.LibraryModalService.hideNewDirectoryInput();
  }
}
