/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Component, Input, Inject, DoCheck } from '@angular/core';
import { LibraryService } from './library.service';
import { datasourceModalMode } from '../../common/datasources/datasource-modal-mode.js';
import { datasourceContext } from '../enums/datasources-context.js';
import '../../components/datasources/datasources-toolbar/datasources-toolbar.less';
import '../../components/datasources/datasources-toolbar/modals/datasources-modals.less';
import '../../components/datasources/datasources-toolbar/modals/modal-footer/modal-footer.less';
import '../../components/datasources/datasources-toolbar/modals/external-file-modal/external-file-modal.less';
import '../../components/datasources/datasources-toolbar/modals/hdfs-modal/hdfs-modal.less';
import '../../components/datasources/datasources-toolbar/modals/library-modal/library-modal.less';

// Phase C / datasources subsystem: migrated from components/datasources/datasources-toolbar. The "New data
// source from …" buttons (Library / Database / External file / HDFS / Google Spreadsheet), each opening the
// corresponding AngularJS modal via the bridged DatasourcesModalsService (modals stay AngularJS, opened
// on-demand). Used only inside the (Angular) datasources-panel template -> declared, not downgraded. The
// $scope.$watch(LibraryService.isUploadingInProgress) -> ngDoCheck. Keeps the modal .less bundled (side-effect
// imports carried over from the legacy component).
@Component({
  standalone: false,
  selector: 'datasources-toolbar',
  template: `
    <div class="datasources-toolbar">
      <div class="title">New data source from</div>

      <button (click)="addDatasource('libraryFile')" class="btn btn-modal">
        <span class="btn-modal__icon sa sa-library"></span>
        <span class="btn-modal__title">Library</span>
        <span *ngIf="uploadingInProgress" class="gradient"></span>
      </button>

      <button (click)="addDatasource('jdbc')" class="btn btn-modal">
        <span class="btn-modal__icon sa sa-database"></span>
        <span class="btn-modal__title">Database</span>
      </button>

      <button [disabled]="context === datasourceContext.WRITE_DATASOURCE"
              (click)="addDatasource('externalFile')" class="btn btn-modal">
        <span class="btn-modal__icon sa sa-external-file"></span>
        <span class="btn-modal__title">External file</span>
      </button>

      <button (click)="addDatasource('hdfs')" class="btn btn-modal">
        <span class="btn-modal__icon sa sa-hdfs"></span>
        <span class="btn-modal__title">HDFS</span>
      </button>

      <button (click)="addDatasource('googleSpreadsheet')" class="btn btn-modal">
        <span class="btn-modal__icon sa sa-google-spreadsheet"></span>
        <span class="btn-modal__title">Google Spreadsheet</span>
      </button>
    </div>
  `
})
export class DatasourcesToolbarComponent implements DoCheck {
  @Input() context: any;
  datasourceContext = datasourceContext;
  uploadingInProgress = false;

  constructor(
    @Inject('DatasourcesModalsService') private DatasourcesModalsService: any,
    private LibraryService: LibraryService
  ) {}

  ngDoCheck(): void {
    const next = (this.LibraryService as any).isUploadingInProgress();
    if (next !== this.uploadingInProgress) {
      this.uploadingInProgress = next;
    }
  }

  addDatasource(datasourceType: string): void {
    this.DatasourcesModalsService.openModal(datasourceType, datasourceModalMode.ADD);
  }
}
