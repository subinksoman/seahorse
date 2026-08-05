/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Injectable } from '@angular/core';
import { datasourceContext } from '../../enums/datasources-context.js';

// Phase C / AngularJS removal: native port of components/datasources/datasources-panel/
// datasources-panel.service.js. Pure UI state for the datasources side-panel (open flag + context +
// on-select handler). Injected by the 6 ng2 consumers via the 'DatasourcesPanelService' string token
// (aliased to this class in bootstrap.ts — was the bridge). No service dependencies.
@Injectable({ providedIn: 'root' })
export class DatasourcesPanelService {
  isDatasourcesOpened = false;
  datasourcesContext: string = datasourceContext.BROWSE_DATASOURCE;
  onDatasourceSelectHandler: ((...args: any[]) => any) | undefined;

  openDatasourcesForBrowsing(): void {
    this.datasourcesContext = datasourceContext.BROWSE_DATASOURCE;
    this.isDatasourcesOpened = true;
  }

  openDatasourcesForReading(): void {
    this.datasourcesContext = datasourceContext.READ_DATASOURCE;
    this.isDatasourcesOpened = true;
  }

  openDatasourcesForWriting(): void {
    this.datasourcesContext = datasourceContext.WRITE_DATASOURCE;
    this.isDatasourcesOpened = true;
  }

  closeDatasources(): void {
    this.datasourcesContext = datasourceContext.BROWSE_DATASOURCE;
    this.isDatasourcesOpened = false;
  }

  setHandlerOnDatasourceSelect(fn: (...args: any[]) => any): void {
    this.onDatasourceSelectHandler = fn;
  }

  isOpenedForRead(): boolean {
    return this.datasourcesContext === datasourceContext.READ_DATASOURCE;
  }

  isOpenedForWrite(): boolean {
    return this.datasourcesContext === datasourceContext.WRITE_DATASOURCE;
  }
}
