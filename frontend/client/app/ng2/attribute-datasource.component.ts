/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Component, Input, Inject, DoCheck } from '@angular/core';
import * as _ from 'lodash';
import { datasourceModalMode } from '../../common/datasources/datasource-modal-mode.js';

// Phase C / deepsense-attributes: migrated from attribute-types/attribute-datasource. Selects a datasource
// for a Read/Write DataFrame node (opens the datasources panel, shows the chosen source with edit/view/clear).
// Downgraded 'attributeDatasource'; attributes-list passes [parameter]. All deps are bridged AngularJS
// services (DatasourcesPanelService / datasourcesService / DatasourcesModalsService / AttributesPanelService).
// The $watch(disabledMode) + $watchGroup(datasources, parameter.value) -> ngDoCheck; angular.copy -> cloneDeep.
@Component({
  standalone: false,
  selector: 'attribute-datasource',
  template: `
    <div class="attribute-datasource">
      <div *ngIf="isDataSourceEmpty()" [ngClass]="{ 'disable-mask': disabledMode }"
           class="datasource-wrapper error-wrapper">
        <div *ngIf="error" class="datasource-wrapper__error-info">{{ error }}</div>
        <div class="datasource-wrapper__select">
          <span class="error-icon fa fa-exclamation-circle"></span>
          <span (click)="openDataSourcePanel()" class="select-label">Select data source</span>
        </div>
      </div>
      <div *ngIf="!isDataSourceEmpty()" class="datasource-wrapper">
        <div [ngClass]="{ 'disable-mask': disabledMode }"
             class="datasource-wrapper__icon sa {{ typeIcon[datasource.params.datasourceType] }}"></div>
        <div [ngClass]="{ 'disable-mask': disabledMode }" (click)="openDataSourcePanel()"
             class="datasource-wrapper__name" [title]="datasource.params.name">{{ datasource.params.name }}</div>
        <div (click)="clearDatasource()" [ngClass]="{ 'disable-mask': disabledMode }"
             class="datasource-wrapper__icon sa sa-cross" title="Clear datasource"></div>
        <div *ngIf="isOwner()" (click)="editDatasource()" [ngClass]="{ 'disable-mask': disabledMode }"
             class="datasource-wrapper__icon sa sa-edit" title="Edit datasource"></div>
        <div *ngIf="!isOwner()" (click)="viewDatasource()"
             class="datasource-wrapper__icon sa sa-view" title="View datasource"></div>
      </div>
    </div>
  `
})
export class AttributeDatasourceComponent implements DoCheck {
  @Input() parameter: any;

  datasource: any;
  disabledMode = false;
  error = '';
  readonly typeIcon: { [key: string]: string } = {
    externalFile: 'sa-external-file',
    libraryFile: 'sa-library',
    hdfs: 'sa-hdfs',
    jdbc: 'sa-database',
    googleSpreadsheet: 'sa-google-spreadsheet'
  };

  constructor(
    @Inject('DatasourcesPanelService') private DatasourcesPanelService: any,
    @Inject('datasourcesService') private datasourcesService: any,
    @Inject('DatasourcesModalsService') private DatasourcesModalsService: any,
    @Inject('AttributesPanelService') private AttributesPanelService: any
  ) {}

  // Legacy $watch(disabledMode) + $watchGroup(datasources, parameter.value): keep disabledMode + the
  // resolved datasource in sync each change-detection pass.
  ngDoCheck(): void {
    this.disabledMode = this.AttributesPanelService.getDisabledMode();
    const list = this.datasourcesService.datasources;
    if (this.parameter && this.parameter.value && Array.isArray(list)) {
      this.datasource = list.find((d: any) => d.id === this.parameter.value);
      this.error = this.datasource ? '' : 'Could not find datasource with given ID.';
    } else if (this.parameter && !this.parameter.value) {
      this.datasource = null;
      this.error = '';
    }
  }

  isDataSourceEmpty(): boolean {
    return _.isEmpty(this.datasource);
  }

  isOwner(): boolean {
    return this.datasource ? this.datasourcesService.isCurrentUserOwnerOfDatasource(this.datasource) : false;
  }

  openDataSourcePanel(): void {
    this.DatasourcesPanelService.setHandlerOnDatasourceSelect((datasource: any) => this.setDatasource(datasource));
    if (this.parameter.schema.type === 'datasourceIdForRead') {
      this.DatasourcesPanelService.openDatasourcesForReading();
    } else {
      this.DatasourcesPanelService.openDatasourcesForWriting();
    }
  }

  clearDatasource(): void {
    this.datasource = null;
    if (this.parameter) { this.parameter.value = null; }
  }

  editDatasource(): void {
    this.openDatasource(datasourceModalMode.EDIT);
  }

  viewDatasource(): void {
    this.openDatasource(datasourceModalMode.VIEW);
  }

  private openDatasource(mode: any): void {
    this.DatasourcesModalsService.openModal(this.datasource.params.datasourceType, mode, this.datasource);
  }

  private setDatasource(datasource: any): void {
    this.DatasourcesPanelService.closeDatasources();
    this.datasource = _.cloneDeep(datasource);
    if (this.parameter) { this.parameter.value = datasource.id; }
  }
}
