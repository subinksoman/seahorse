/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Component, DoCheck, Inject } from '@angular/core';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { DatasourceModalBase } from './datasource-modal-base';

// eslint-disable-next-line no-useless-escape
const HDFS_REGEX = /(hdfs):\/\/([\w\-_]+)+([\w\-\\.,@?^=%&:/~\\+#]*[\w\-\\@?^=%&/~\\+#])?/;
const HDFS_PREFIX = 'hdfs://';

// Phase C / AngularJS removal: the HDFS datasource modal on CDK/ModalService (was hdfs-modal +
// controller). Hosts the native <file-settings>. The path field keeps a buffer (prefix hidden) and
// re-prefixes hdfs://. Manual bindings; inlined footer; the deep $watch -> ngDoCheck.
@Component({
  standalone: false,
  template: `
    <div class="modal-content">
      <div class="datasources-modal">
        <div class="datasources-modal__header"><div class="modal-title">HDFS</div></div>
        <div class="datasources-modal__body">
          <div class="datasources-modal__body-row">
            <label class="title">HDFS path</label>
            <div class="icon-input">
              <span class="hdfs-prefix">{{ prefix }}</span>
              <input [disabled]="previewMode" [value]="hdfsPathBuffer"
                     (input)="hdfsPathBuffer = $any($event.target).value; onChangeHandler(); formDirty = true"
                     placeholder="path/to/file.csv" class="form-control" type="text"/>
              <div *ngIf="!previewMode" class="icon-input__status">
                <div [ngClass]="statusClass(isHdfsPathValid)" class="sa icon"></div>
              </div>
            </div>
          </div>

          <file-settings [disabledMode]="previewMode" [fileSettings]="p"
                         (onChange)="onFileSettingsChange($event)"></file-settings>
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
export class HdfsModalComponent extends DatasourceModalBase implements DoCheck {
  readonly prefix = HDFS_PREFIX;
  hdfsPathBuffer = '';
  isHdfsPathValid: any = false;
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
      this.hdfsPathBuffer = this.datasourceParams.hdfsParams.hdfsPath.replace(HDFS_PREFIX, '');
      this.validateHdfsPath();
    } else {
      this.datasourceParams = {
        name: '', visibility: 'privateVisibility', datasourceType: 'hdfs',
        hdfsParams: {
          hdfsPath: '', fileFormat: 'csv',
          csvFileFormatParams: { includeHeader: true, convert01ToBoolean: false, separatorType: 'comma', customSeparator: '' }
        }
      };
    }
  }

  get p(): any { return this.datasourceParams.hdfsParams; }

  ngDoCheck(): void {
    this.canAddNewDatasource = this.canAddDatasource() && this.isCsvSeparatorValid(this.p) && this.p.hdfsPath !== 'hdfs://';
  }

  onChangeHandler(): void {
    this.hdfsPathBuffer = this.hdfsPathBuffer.replace(HDFS_PREFIX, '');
    this.p.hdfsPath = `${HDFS_PREFIX}${this.hdfsPathBuffer}`;
    this.validateHdfsPath();
  }

  validateHdfsPath(): void {
    this.isHdfsPathValid = this.p.hdfsPath !== '' && this.p.hdfsPath.match(HDFS_REGEX);
  }

  onFileSettingsChange(newFileSettings: any): void {
    this.datasourceParams.hdfsParams = Object.assign({ hdfsPath: this.p.hdfsPath }, newFileSettings);
  }

  statusClass(valid: any): any {
    const show = this.formDirty || this.originalDatasource;
    return { 'sa-ok status-ok': valid && show, 'status-error': !valid && show };
  }
}
