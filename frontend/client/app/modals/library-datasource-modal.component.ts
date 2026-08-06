/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Component, OnInit, DoCheck, Inject } from '@angular/core';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { DatasourceModalBase } from './datasource-modal-base';
import { LibraryModalService } from '../services/library-modal.service';

// Phase C / AngularJS removal: the Library datasource modal on CDK/ModalService (was library-modal +
// LibraryModalController — the DATASOURCE dialog, not the file picker). Hosts native <file-settings>;
// Browse opens the library picker (LibraryModalService, still uib — CDK's z-index 1100 keeps this
// dialog above it). Completes the 5 datasource modals (DatasourcesModalsService drops its uib branch).
@Component({
  standalone: false,
  template: `
    <div class="modal-content" *ngIf="!browsing">
      <div class="datasources-modal">
        <div class="datasources-modal__header"><div class="modal-title">Library</div></div>
        <div class="datasources-modal__body">
          <div class="datasources-modal__body-row">
            <label class="title">Source</label>
            <div class="library-source">
              <input [value]="p.libraryPath" class="form-control" type="text" placeholder="library/your-file.csv" disabled/>
              <div (click)="openLibrary()" class="btn library-source__browse-btn">
                <i class="sa sa-library icon"></i><span>Browse</span>
              </div>
            </div>
          </div>

          <file-settings [disabledMode]="previewMode" [fileSettings]="p"
                         (onChange)="onFileSettingsChange($event)"></file-settings>

          <div class="datasources-modal__body-row">
            <div class="public-param-row">
              <div class="checkbox-wrapper">
                <label class="format-form-label" [ngClass]="{'active': datasourceParams.visibility === 'publicVisibility'}">
                  <input [disabled]="previewMode" type="checkbox"
                         [checked]="datasourceParams.visibility === 'publicVisibility'"
                         (change)="datasourceParams.visibility = $any($event.target).checked ? 'publicVisibility' : 'privateVisibility'"/>
                  <span>Public</span>
                </label>
              </div>
              <div class="public-param-row__label">
                (Public data sources are accessible by all users of this instance of Seahorse)
              </div>
            </div>
          </div>
        </div>

        <div class="datasources-modal__footer">
          <div class="datasources-modal__footer-input">
            <label class="title">Name</label>
            <div class="icon-input">
              <input [disabled]="previewMode" [value]="datasourceParams.name"
                     (input)="datasourceParams.name = $any($event.target).value; nameDirty = true"
                     placeholder="Name" class="form-control" type="text"/>
              <div *ngIf="!previewMode" class="icon-input__status">
                <div [ngClass]="{
                       'sa-ok status-ok': !doesNameExists() && datasourceParams.name !== '' && (nameDirty || originalDatasource),
                       'sa-cross status-error': nameDirty && (doesNameExists() || datasourceParams.name === '')
                     }" class="sa icon"></div>
              </div>
            </div>
            <label *ngIf="doesNameExists()" class="name-exists">
              Datasource with this name already exists. Choose another name.
            </label>
          </div>
          <button *ngIf="!previewMode" [disabled]="!canAddNewDatasource" (click)="ok()" class="btn btn-blue" type="button">Ok</button>
          <button *ngIf="!previewMode" (click)="cancel()" class="btn btn-white" type="button">Cancel</button>
          <button *ngIf="previewMode" (click)="cancel()" class="btn btn-blue" type="button">Close</button>
        </div>
      </div>
    </div>
  `
})
export class LibraryDatasourceModalComponent extends DatasourceModalBase implements OnInit, DoCheck {
  private isNew = false;
  browsing = false;

  constructor(
    @Inject('datasourcesService') datasourcesService: any,
    dialogRef: DialogRef<any>,
    @Inject(DIALOG_DATA) data: any,
    private libraryModalService: LibraryModalService,
    @Inject('DatasourcesPanelService') private datasourcesPanelService: any
  ) {
    super(datasourcesService, dialogRef, data);
    const editedDatasource = data.editedDatasource;
    if (editedDatasource) {
      this.originalDatasource = editedDatasource;
      this.datasourceParams = editedDatasource.params;
    } else {
      this.isNew = true;
      this.datasourceParams = {
        name: '', visibility: 'privateVisibility', datasourceType: 'libraryFile',
        libraryFileParams: {
          libraryPath: '', fileFormat: 'csv',
          csvFileFormatParams: { includeHeader: true, convert01ToBoolean: false, separatorType: 'comma', customSeparator: '' }
        }
      };
    }
  }

  ngOnInit(): void {
    if (this.isNew) { this.openLibrary(); }
  }

  get p(): any { return this.datasourceParams.libraryFileParams; }

  ngDoCheck(): void {
    this.canAddNewDatasource = this.canAddDatasource() && this.isCsvSeparatorValid(this.p) && this.p.libraryPath !== '';
  }

  // Hide this form's body while the file picker is open on top of it, so only the "Select data frame"
  // browser shows (the taller form otherwise peeks above the picker). Restored when the picker closes.
  openLibrary(): void {
    this.browsing = true;
    if (this.datasourcesPanelService.isOpenedForWrite()) {
      (this.libraryModalService as any).openLibraryModal('write-to-file').then((fullFilePath: any) => {
        this.browsing = false;
        if (fullFilePath) { this.setDatasourceParams(fullFilePath); }
        else if (!fullFilePath && !this.p.libraryPath) { this.dialogRef.close(undefined); }
      });
    } else {
      (this.libraryModalService as any).openLibraryModal('read-file').then((file: any) => {
        this.browsing = false;
        if (file) { this.setDatasourceParams(file.uri); }
        else if (!file && !this.p.libraryPath) { this.dialogRef.close(undefined); }
      });
    }
  }

  onFileSettingsChange(newFileSettings: any): void {
    this.datasourceParams.libraryFileParams = Object.assign({ libraryPath: this.p.libraryPath }, newFileSettings);
  }

  private parsePath(filename: string): any {
    const splitFilenameRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^/]+?|)(\.[^./]*|))(?:[/]*)$/;
    const parts = splitFilenameRe.exec(filename).slice(1);
    parts[1] = parts[1] || '';
    parts[2] = parts[2] || '';
    parts[3] = parts[3] || '';
    return {
      base: parts[2],
      ext: parts[3],
      name: parts[2].slice(0, parts[2].length - parts[3].length)
    };
  }

  private setDatasourceParams(fullFilePath: string): void {
    const { name, ext } = this.parsePath(fullFilePath.replace('library:/', ''));
    let fileFormat = ext.slice(1).toLowerCase();
    if (fileFormat !== 'csv' && fileFormat !== 'json') { fileFormat = 'csv'; }
    const libraryFileParams: any = { libraryPath: fullFilePath, fileFormat };
    if (fileFormat === 'csv') {
      libraryFileParams.csvFileFormatParams = {
        includeHeader: true, convert01ToBoolean: false, separatorType: 'comma', customSeparator: ''
      };
    }
    this.datasourceParams.name = name;
    this.datasourceParams.libraryFileParams = libraryFileParams;
  }
}
