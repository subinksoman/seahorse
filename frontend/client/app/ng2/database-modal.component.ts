/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Component, DoCheck, Inject } from '@angular/core';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { DatasourceModalBase } from './datasource-modal-base';

// Phase C / AngularJS removal: the "Select from Database" (jdbc) datasource modal on CDK/ModalService
// (was database-modal + DatabaseModalController). Form bindings are manual ([value]/(input)/[checked]/
// (change), no @angular/forms); the shared modal-footer (name + status + Ok/Cancel) is inlined. The two
// $watch (name auto-copy from the table/query field; canAddNewDatasource) -> ngDoCheck.
@Component({
  standalone: false,
  template: `
    <div class="modal-content">
      <div class="datasources-modal">
        <div class="datasources-modal__header"><div class="modal-title">Select from Database</div></div>
        <div class="datasources-modal__body">
          <div class="datasources-modal__body-row half-width">
            <label class="title">Driver</label>
            <div class="icon-input">
              <input [disabled]="previewMode" [value]="datasourceParams.jdbcParams.driver"
                     (input)="datasourceParams.jdbcParams.driver = $any($event.target).value; formDirty = true"
                     placeholder="e.g. com.mysql.jdbc.Driver" class="form-control" type="text"/>
              <div *ngIf="!previewMode" class="icon-input__status">
                <div [ngClass]="statusClass(datasourceParams.jdbcParams.driver)" class="sa icon"></div>
              </div>
            </div>
          </div>

          <div class="datasources-modal__body-row">
            <label class="title">JDBC connection string</label>
            <div class="icon-input">
              <input [disabled]="previewMode" [value]="datasourceParams.jdbcParams.url"
                     (input)="datasourceParams.jdbcParams.url = $any($event.target).value; formDirty = true"
                     placeholder="Connection string" class="form-control" type="text"/>
              <div *ngIf="!previewMode" class="icon-input__status">
                <div [ngClass]="statusClass(datasourceParams.jdbcParams.url)" class="sa icon"></div>
              </div>
            </div>
          </div>

          <div class="datasources-modal__body-row">
            <div class="radio-row">
              <div class="radio-wrapper">
                <label [ngClass]="{'active': type === 'table'}" class="format-form-label">
                  <input [disabled]="previewMode" type="radio" name="dbqtype" [checked]="type === 'table'"
                         (change)="type = 'table'; onQueryTypeChange()"/>
                  <span class="radio-title">Table name</span>
                </label>
              </div>
              <div class="radio-wrapper">
                <label [ngClass]="{'active': type === 'query'}" class="format-form-label">
                  <input [disabled]="previewMode" type="radio" name="dbqtype" [checked]="type === 'query'"
                         (change)="type = 'query'; onQueryTypeChange()"/>
                  <span class="radio-title">Custom SQL query</span>
                </label>
              </div>
            </div>
            <div class="query-row">
              <input [disabled]="previewMode" [value]="sqlInstruction"
                     (input)="sqlInstruction = $any($event.target).value; onQueryTypeChange()"
                     [placeholder]="type === 'table' ? 'Table name' : 'Custom query'" class="form-control" type="text"/>
            </div>
          </div>

          <div class="datasources-modal__body-row">
            <div class="public-param-row">
              <div class="checkbox-wrapper">
                <label [ngClass]="{'active': datasourceParams.visibility === 'publicVisibility'}" class="format-form-label">
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
                     (focus)="stopCopyingFromUserField()" placeholder="Name" class="form-control" type="text"/>
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
export class DatabaseModalComponent extends DatasourceModalBase implements DoCheck {
  type = 'table';
  sqlInstruction = '';
  copyFromQueryInput = true;
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
      this.copyFromQueryInput = false;
      if (editedDatasource.params.jdbcParams.query) {
        this.type = 'query';
        this.sqlInstruction = editedDatasource.params.jdbcParams.query;
      } else if (editedDatasource.params.jdbcParams.table) {
        this.type = 'table';
        this.sqlInstruction = editedDatasource.params.jdbcParams.table;
      }
    } else {
      this.type = 'table';
      this.datasourceParams = {
        name: '', visibility: 'privateVisibility', datasourceType: 'jdbc',
        jdbcParams: { driver: '', url: '', query: null, table: null }
      };
    }
  }

  ngDoCheck(): void {
    if (this.copyFromQueryInput) { this.datasourceParams.name = this.sqlInstruction; }
    this.canAddNewDatasource = this.canAddDatasource() &&
      this.datasourceParams.jdbcParams.driver !== '' && this.datasourceParams.jdbcParams.url !== '';
  }

  override stopCopyingFromUserField(): void { this.copyFromQueryInput = false; }

  onQueryTypeChange(): void {
    if (this.type === 'table') {
      this.datasourceParams.jdbcParams.query = null;
      this.datasourceParams.jdbcParams.table = this.sqlInstruction;
    } else {
      this.datasourceParams.jdbcParams.query = this.sqlInstruction;
      this.datasourceParams.jdbcParams.table = null;
    }
  }

  statusClass(value: any): any {
    const show = this.formDirty || this.originalDatasource;
    return { 'sa-ok status-ok': value && show, 'status-error': !value && show };
  }
}
