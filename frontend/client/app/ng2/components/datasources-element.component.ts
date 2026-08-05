/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Component, Input, Output, EventEmitter, Inject, OnInit } from '@angular/core';
import { DatasourcesModalsService } from '../services/datasources-modals.service';
import { DeleteModalService } from '../services/delete-modal.service';
import { datasourceModalMode } from '../../../common/datasources/datasource-modal-mode.js';
import { datasourceContext } from '../../enums/datasources-context.js';
import '../../../components/datasources/datasources-element/datasources-element.less';

const COOKIE_NAME = 'DELETE_DATASOURCE_COOKIE';
const DATASOURCE_ICON: { [key: string]: string } = {
  externalFile: 'sa-external-file',
  libraryFile: 'sa-library',
  hdfs: 'sa-hdfs',
  jdbc: 'sa-database',
  googleSpreadsheet: 'sa-google-spreadsheet'
};

// Phase C / datasources subsystem (bottom-up leaf): migrated from components/datasources/datasources-element.
// One row in the datasources list (icon, name, edit/delete actions, owner, visibility). Downgraded as
// directive 'datasourcesElement'; its usage inside the (still AngularJS) datasources-list ng-repeat rebinds
// to Angular syntax. Injects the already-migrated Angular DeleteModalService directly + the bridged AngularJS
// datasourcesService / DatasourcesModalsService. The `&` onSelect -> @Output; the AngularJS `date` filter is
// Angular's built-in date pipe (via BrowserModule). Derived fields computed once in ngOnInit.
@Component({
  standalone: false,
  selector: 'datasources-element',
  template: `
    <div class="datasources-element">
      <div class="datasources-element__name-wrapper"
           [ngClass]="{ 'datasources-element__name-wrapper--disabled': !isSelectable() }"
           (click)="selectDatasource()">
        <div class="datasources-element__type sa {{ datasourceIcon }}"></div>
        <div class="datasources-element__name" [title]="datasource.params.name">{{ datasource.params.name }}</div>
      </div>

      <div class="datasources-element__icon-wrapper">
        <div (click)="openDatasource()"
             class="datasources-element__edit sa {{ openActionIcon }}"
             [title]="openActionTitle"></div>
        <div (click)="deleteDatasource()"
             [ngClass]="{ 'datasources-element__icon-wrapper--disabled': !isOwner() }"
             class="datasources-element__delete sa sa-delete"
             title="Delete"></div>
      </div>

      <div class="datasources-element__created">
        {{ datasource.creationDateTime | date:'dd/MM/yyyy - HH:mm' }}
      </div>

      <div class="datasources-element__owner"
           [ngClass]="{ 'datasources-element__owner--current': isOwner() }"
           [title]="ownerName">
        {{ ownerName }}
        <span *ngIf="isOwner()" class="datasources-element__owner-icon sa sa-user"></span>
      </div>
      <div class="datasources-element__access">
        {{ visibilityLabel[datasource.params.visibility] }}
      </div>
    </div>
  `
})
export class DatasourcesElementComponent implements OnInit {
  @Input() context: any;
  @Input() datasource: any;
  @Output() onSelect = new EventEmitter<any>();

  datasourceIcon: string;
  ownerName: string;
  openActionIcon: string;
  openActionTitle: string;
  readonly visibilityLabel: { [key: string]: string } = {
    publicVisibility: 'Public',
    privateVisibility: 'Private'
  };

  constructor(
    private DeleteModalService: DeleteModalService,
    private DatasourcesModalsService: DatasourcesModalsService,
    @Inject('datasourcesService') private datasourcesService: any
  ) {}

  ngOnInit(): void {
    this.datasourceIcon = DATASOURCE_ICON[this.datasource.params.datasourceType];
    this.context = this.context || datasourceContext.BROWSE_DATASOURCE;
    if (this.isOwner()) {
      this.ownerName = 'You';
      this.openActionIcon = 'sa-edit';
      this.openActionTitle = 'Edit';
    } else {
      this.ownerName = this.datasource.ownerName;
      this.openActionIcon = 'sa-view';
      this.openActionTitle = 'See';
    }
  }

  deleteDatasource(): void {
    this.DeleteModalService.handleDelete(() => {
      this.datasourcesService.deleteDatasource(this.datasource.id);
    }, COOKIE_NAME);
  }

  isOwner(): boolean {
    return this.datasourcesService.isCurrentUserOwnerOfDatasource(this.datasource);
  }

  isSelectable(): boolean {
    if (this.context === datasourceContext.WRITE_DATASOURCE) {
      return this.datasource.params.datasourceType !== 'externalFile';
    }
    return this.context !== datasourceContext.BROWSE_DATASOURCE;
  }

  openDatasource(): void {
    const datasourceType = this.datasource.params.datasourceType;
    const mode = this.isOwner() ? datasourceModalMode.EDIT : datasourceModalMode.VIEW;
    this.DatasourcesModalsService.openModal(datasourceType, mode, this.datasource);
  }

  selectDatasource(): void {
    if (this.isSelectable()) {
      this.onSelect.emit(this.datasource);
    }
  }
}
