/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Component, Inject, OnInit, DoCheck } from '@angular/core';
import { datasourceContext } from '../enums/datasources-context.js';
import '../../components/datasources/datasources-panel/datasources-panel.less';

// Phase C / datasources subsystem (top): migrated from components/datasources/datasources-panel. The slide-out
// "Data sources" panel. Downgraded as directive 'datasourcesPanel'; its single usage in workflows-editor.html
// has no bindings so needs no rebind. Hosts the migrated <datasources-toolbar> + <datasources-list> directly.
// Injects the bridged datasourcesService / DatasourcesPanelService. Constructor fetch + two $scope.$watch ->
// ngOnInit fetch + ngDoCheck mirroring. onSelect now receives the datasource object directly (the whole
// datasources element->list->panel chain emits the raw object).
@Component({
  standalone: false,
  selector: 'datasources-panel',
  template: `
    <div class="datasources-panel">
      <div class="datasources-panel__header">
        <div class="title">Data sources</div>
      </div>

      <datasources-toolbar [context]="context"></datasources-toolbar>

      <datasources-list
        [datasources]="datasources"
        [context]="context"
        (onSelect)="onSelect($event)"
      ></datasources-list>
    </div>
  `
})
export class DatasourcesPanelComponent implements OnInit, DoCheck {
  datasources: any;
  context: any;

  constructor(
    @Inject('datasourcesService') private datasourcesService: any,
    @Inject('DatasourcesPanelService') private DatasourcesPanelService: any
  ) {}

  ngOnInit(): void {
    this.datasourcesService.fetchDatasources();
  }

  ngDoCheck(): void {
    this.datasources = this.datasourcesService.datasources;
    this.context = this.DatasourcesPanelService.datasourcesContext;
  }

  onSelect(datasource: any): void {
    if (this.context !== datasourceContext.BROWSE_DATASOURCE) {
      this.DatasourcesPanelService.onDatasourceSelectHandler(datasource);
    }
  }
}
