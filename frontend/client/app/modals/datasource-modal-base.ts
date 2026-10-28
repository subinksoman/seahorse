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
  previewMode: boolean;
  canAddNewDatasource = false;
  nameDirty = false;

  constructor(protected datasourcesService: any, protected dialogRef: DialogRef<any>, data: any) {
    this.previewMode = data.mode === 'VIEW';
  }

  // The form must never edit the object the datasources list holds: typing into it would rename
  // the list entry live, so the name-uniqueness check would find the datasource being edited and
  // report its own new name as taken — and Cancel would leave the edits behind.
  protected editableParams(datasource: any): any {
    return copy(datasource.params);
  }

  // A name clashes only when some OTHER datasource has it, so the edited one is excluded by id.
  doesNameExists(): boolean {
    return this.datasourcesService.isNameUsed(
      this.datasourceParams.name,
      this.originalDatasource ? this.originalDatasource.id : undefined);
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
      const updated = Object.assign({}, this.originalDatasource, { params: this.datasourceParams });
      this.datasourcesService.updateDatasource(updated).then(() => this.dialogRef.close(true)).catch(() => {});
    } else {
      this.datasourcesService.addDatasource(this.datasourceParams).then(() => this.dialogRef.close(true)).catch(() => {});
    }
  }
}
