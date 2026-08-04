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
// The not-yet-converted datasource modal (library-datasource) stays AngularJS (uib) via $uibModal.
import libraryTpl from '../../components/datasources/datasources-toolbar/modals/library-modal/library-modal.html';

declare const angular: any; // global — angular.copy + angular.element(appendTo)

// CDK datasource modals (Angular components).
const CDK_CONFIGS: { [k: string]: any } = {
  jdbc: DatabaseModalComponent,
  googleSpreadsheet: GoogleSpreadsheetModalComponent,
  externalFile: ExternalFileModalComponent,
  hdfs: HdfsModalComponent
};

const UIB_CONFIGS: { [k: string]: { tpl: string; ctrl: string } } = {
  libraryFile: { tpl: libraryTpl, ctrl: 'LibraryModalController' }
};

// Phase C / AngularJS removal: migrated from datasources-modals.service.js. Opens the datasource modals.
// jdbc (database) is now the CDK DatabaseModalComponent (ModalService); the other 4 stay AngularJS uib
// modals (bridged $uibModal) until converted. Injected directly (Angular class) by the datasources
// toolbar / element / attribute-datasource components — the bridge is dropped.
@Injectable({ providedIn: 'root' })
export class DatasourcesModalsService {
  constructor(
    private modal: ModalService,
    @Inject('$uibModal') private $uibModal: any,
    @Inject('$log') private $log: any
  ) {}

  openModal(datasourceType: string, mode: any, datasource?: any): any {
    this.$log.info('DatasourcesModalsService.openModal()', mode, datasourceType);

    if (CDK_CONFIGS[datasourceType]) {
      return this.modal.open(CDK_CONFIGS[datasourceType], { editedDatasource: datasource, mode },
        { panelClass: ['ds-modal-panel', 'ds-modal-lg'] });
    }

    const cfg = UIB_CONFIGS[datasourceType];
    const appendTo = angular.element(document.querySelector('.datasources-panel'));
    return this.$uibModal.open({
      appendTo,
      windowClass: 'panel-datasource-modal',
      animation: true,
      templateUrl: cfg.tpl,
      size: 'lg',
      controller: cfg.ctrl,
      controllerAs: '$ctrl',
      backdrop: 'static',
      keyboard: true,
      resolve: {
        editedDatasource: () => angular.copy(datasource),
        mode: () => mode
      }
    });
  }
}
