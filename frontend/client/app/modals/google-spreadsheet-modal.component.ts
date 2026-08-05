/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Component, DoCheck, Inject } from '@angular/core';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { DatasourceModalBase } from './datasource-modal-base';

const GOOGLE_SPREADSHEET_REGEX = /[a-zA-Z0-9-_]+/;
const FULL_SPREADSHEET_URI_REGEX = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/;

// Phase C / AngularJS removal: the Google Spreadsheet datasource modal on CDK/ModalService (was
// google-spreadsheet-modal + controller). Pure form (no file-settings). Manual bindings; inlined
// modal-footer; the $watch (canAddNewDatasource + spreadsheet-id URL extraction) -> ngDoCheck.
@Component({
  standalone: false,
  template: `
    <div class="modal-content">
      <div class="datasources-modal">
        <div class="datasources-modal__header"><div class="modal-title">Google Spreadsheet</div></div>
        <div class="datasources-modal__body">
          <div class="datasources-modal__body-row">
            <label class="title">Google Spreadsheet ID / URL to Google Spreadsheet</label>
            <div class="icon-input">
              <input [disabled]="previewMode" [value]="p.googleSpreadsheetId"
                     (input)="p.googleSpreadsheetId = $any($event.target).value; formDirty = true"
                     type="text" class="form-control" placeholder="Google spreadsheet ID"/>
              <div *ngIf="!previewMode" class="icon-input__status">
                <div [ngClass]="statusClass(isGoogleSpreadsheetIdValid())" class="sa icon"></div>
              </div>
            </div>
          </div>

          <div class="datasources-modal__body-row">
            <label class="title">Google service account credentials JSON</label>
            <div class="icon-input">
              <input [disabled]="previewMode" [value]="p.googleServiceAccountCredentials"
                     (input)="p.googleServiceAccountCredentials = $any($event.target).value; formDirty = true; isGoogleCredentialsValid()"
                     type="text" class="form-control" placeholder="JSON credentials"/>
              <div *ngIf="!previewMode" class="icon-input__status">
                <div [ngClass]="statusClass(areCredentialsValid)" class="sa icon"></div>
              </div>
            </div>
          </div>

          <div class="datasources-modal__body-row">
            <div class="checkbox-row">
              <div class="checkbox-wrapper">
                <label class="format-form-label" [ngClass]="{'active': p.includeHeader}">
                  <input type="checkbox" [checked]="p.includeHeader"
                         (change)="p.includeHeader = $any($event.target).checked"/>
                  <span>First row includes column names</span>
                </label>
              </div>
              <div class="checkbox-wrapper">
                <label class="format-form-label" [ngClass]="{'active': p.convert01ToBoolean}">
                  <input [disabled]="previewMode" type="checkbox" [checked]="p.convert01ToBoolean"
                         (change)="p.convert01ToBoolean = $any($event.target).checked"/>
                  <span>Convert 0 and 1 to boolean</span>
                </label>
              </div>
            </div>
          </div>

          <div class="datasources-modal__body-row">
            <div class="public-param-row">
              <div class="checkbox-wrapper">
                <label class="format-form-label"
                       [ngClass]="{'active': datasourceParams.visibility === 'publicVisibility', 'disabled': previewMode}">
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
export class GoogleSpreadsheetModalComponent extends DatasourceModalBase implements DoCheck {
  areCredentialsValid = false;
  formDirty = false;

  constructor(
    @Inject('datasourcesService') datasourcesService: any,
    dialogRef: DialogRef<any>,
    @Inject(DIALOG_DATA) data: any
  ) {
    super(datasourcesService, dialogRef, data);
    const editedDatasource = data.editedDatasource;
    if (editedDatasource) {
      this.originalDatasource = editedDatasource;
      this.datasourceParams = editedDatasource.params;
      this.isGoogleCredentialsValid();
    } else {
      this.datasourceParams = {
        name: '', visibility: 'privateVisibility', datasourceType: 'googleSpreadsheet',
        googleSpreadsheetParams: {
          googleSpreadsheetId: '', googleServiceAccountCredentials: '',
          includeHeader: false, convert01ToBoolean: false
        }
      };
    }
  }

  get p(): any { return this.datasourceParams.googleSpreadsheetParams; }

  ngDoCheck(): void {
    // Extract the id from a full spreadsheet URL if one was pasted.
    const results = String(this.p.googleSpreadsheetId).match(FULL_SPREADSHEET_URI_REGEX);
    if (results && results.length) { this.p.googleSpreadsheetId = results[1]; }
    this.canAddNewDatasource = this.canAddDatasource() && this.isGoogleSpreadsheetIdValid() && this.areCredentialsValid;
  }

  isGoogleSpreadsheetIdValid(): boolean {
    return !!String(this.p.googleSpreadsheetId).match(GOOGLE_SPREADSHEET_REGEX);
  }

  isGoogleCredentialsValid(): void {
    try {
      JSON.parse(this.p.googleServiceAccountCredentials);
      this.areCredentialsValid = true;
    } catch (e) {
      this.areCredentialsValid = false;
    }
  }

  statusClass(valid: any): any {
    const show = this.formDirty || this.originalDatasource;
    return { 'sa-ok status-ok': valid && show, 'status-error': !valid && show };
  }
}
