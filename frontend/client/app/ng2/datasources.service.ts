/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Injectable, Inject } from '@angular/core';
import { DatasourcesApiService } from './datasources-api.service';
import { UUIDGenerator } from './uuid-generator.service';
import { UserService } from './user.service';

// Phase C / AngularJS removal: native port of common/datasources/datasources.service.js. Holds the
// datasources list + CRUD (create/update/delete re-fetch). Injected by the 9 ng2 datasource consumers
// via the 'datasourcesService' string token (aliased to this class in bootstrap.ts — was the bridge).
// Deps are all Angular now (DatasourcesApiService/UUIDGenerator/UserService) except the bridged $log.
@Injectable({ providedIn: 'root' })
export class DatasourcesService {
  datasources: any[] = [];

  constructor(
    private datasourcesApi: DatasourcesApiService,
    private uuid: UUIDGenerator,
    private userService: UserService,
    @Inject('$log') private $log: any
  ) {}

  addDatasource(params: any): any {
    this.$log.info('DatasourcesService.addDatasource()', params);
    const datasourceId = this.uuid.generateUUID();
    return this.datasourcesApi.putDatasource(datasourceId, params).then(() => this.fetchDatasources());
  }

  deleteDatasource(datasourceId: string): any {
    this.$log.info(`DatasourcesService.deleteDatasource(${datasourceId})`);
    return this.datasourcesApi.deleteDatasource(datasourceId).then(() => this.fetchDatasources());
  }

  fetchDatasources(): any {
    this.$log.info('DatasourcesService.fetchDatasources()');
    return this.datasourcesApi.getDatasources().then((datasources: any[]) => { this.datasources = datasources; });
  }

  updateDatasource(datasource: any): any {
    this.$log.info('DatasourcesService.updateDatasource()', datasource);
    return this.datasourcesApi.putDatasource(datasource.id, datasource.params).then(() => this.fetchDatasources());
  }

  isCurrentUserOwnerOfDatasource(datasource: any): boolean {
    return this.userService.getSeahorseUser().id === datasource.ownerId;
  }

  isNameUsed(datasourceName: string): boolean {
    return !!this.datasources.find((datasource) => datasource.params.name === datasourceName);
  }
}
