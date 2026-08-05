/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Injectable, Inject } from '@angular/core';
import { ModalService } from './modal.service';
import { DatabaseModalComponent } from './database-modal.component';
import { GoogleSpreadsheetModalComponent } from './google-spreadsheet-modal.component';
import { ExternalFileModalComponent } from './external-file-modal.component';
import { HdfsModalComponent } from './hdfs-modal.component';
import { LibraryDatasourceModalComponent } from './library-datasource-modal.component';

// All 5 datasource modals are Angular CDK components now.
const CDK_CONFIGS: { [k: string]: any } = {
  jdbc: DatabaseModalComponent,
  googleSpreadsheet: GoogleSpreadsheetModalComponent,
  externalFile: ExternalFileModalComponent,
  hdfs: HdfsModalComponent,
  libraryFile: LibraryDatasourceModalComponent
};

// Phase C / AngularJS removal: migrated from datasources-modals.service.js. Opens the datasource modals
// — now ALL on CDK/ModalService (uib fully dropped here). Injected directly (Angular class) by the
// datasources toolbar / element / attribute-datasource components.
@Injectable({ providedIn: 'root' })
export class DatasourcesModalsService {
  constructor(private modal: ModalService) {}

  openModal(datasourceType: string, mode: any, datasource?: any): any {
    console.info('DatasourcesModalsService.openModal()', mode, datasourceType);
    return this.modal.open(CDK_CONFIGS[datasourceType], { editedDatasource: datasource, mode },
      { panelClass: ['ds-modal-panel', 'ds-modal-lg'] });
  }
}
