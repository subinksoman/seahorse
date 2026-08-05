/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { DialogRef } from '@angular/cdk/dialog';
import { copy } from '../core/ng-compat';

// Phase C / AngularJS removal: Angular port of datasource-modal.class.js — the shared logic behind the
// datasource modals (name-uniqueness, add/update, cancel). The CDK datasource-modal components extend
// this; the shared modal-footer is inlined into each component's template (no ng-include).
export abstract class DatasourceModalBase {
  datasourceParams: any;
  originalDatasource: any;   // the (uncopied) edited datasource — used by ok() + the status icons
  editedDatasource: any;     // angular.copy — used by doesNameExists()
  previewMode: boolean;
  canAddNewDatasource = false;
  nameDirty = false;

  constructor(protected datasourcesService: any, protected dialogRef: DialogRef<any>, data: any) {
    this.previewMode = data.mode === 'VIEW';
    this.editedDatasource = data.editedDatasource ? copy(data.editedDatasource) : null;
  }

  doesNameExists(): boolean {
    if (this.editedDatasource && this.editedDatasource.params.name === this.datasourceParams.name) {
      return false;
    }
    return this.datasourcesService.isNameUsed(this.datasourceParams.name);
  }

  canAddDatasource(): boolean {
    return this.datasourceParams.name !== '' && !this.doesNameExists();
  }

  isCsvSeparatorValid(fileParams: any): boolean {
    if (fileParams.fileFormat !== 'csv') { return true; }
    const { separatorType, customSeparator } = fileParams.csvFileFormatParams;
    if (!separatorType) { return false; }
    return separatorType === 'custom' ? customSeparator !== '' : true;
  }

  stopCopyingFromUserField(): void { /* overridden where a field auto-fills the name */ }

  cancel(): void { this.dialogRef.close(undefined); }

  ok(): void {
    if (this.originalDatasource) {
      const updated = Object.assign({}, this.originalDatasource, this.datasourceParams);
      this.datasourcesService.updateDatasource(updated).then(() => this.dialogRef.close(true)).catch(() => {});
    } else {
      this.datasourcesService.addDatasource(this.datasourceParams).then(() => this.dialogRef.close(true)).catch(() => {});
    }
  }
}
