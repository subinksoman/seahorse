/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Injectable, Inject } from '@angular/core';
import { HttpService } from './http.service';

// Phase C / AngularJS removal: native port of common/api/datasources-api.service.js (the Datasource
// Manager REST client). The tiny ApiBaseClass (apiUrl from config + getData/makeEndpointUrl) is inlined
// here rather than migrated separately. Uses the bridged $http (still an AngularJS core service, so its
// promises + interceptors are unchanged) + the bridged config constant.
@Injectable({ providedIn: 'root' })
export class DatasourcesApiService {
  private readonly servicePath = '/datasourcemanager/v1';
  private readonly apiUrl: string;

  constructor(private $http: HttpService, @Inject('config') config: any) {
    this.apiUrl = `${config.apiHost}:${config.apiPort}`;
  }

  private makeEndpointUrl(endpointPath = ''): string {
    return `${this.apiUrl}${this.servicePath}${endpointPath}`;
  }

  private getData = (result: any): any => result.data;

  getDatasources(): any {
    return this.$http.get(this.makeEndpointUrl('/datasources')).then(this.getData);
  }

  getDatasource(datasourceId: string): any {
    return this.$http.get(this.makeEndpointUrl(`/datasources/${datasourceId}`)).then(this.getData);
  }

  putDatasource(datasourceId: string, datasourceParams: any): any {
    return this.$http.put(this.makeEndpointUrl(`/datasources/${datasourceId}`), datasourceParams).then(this.getData);
  }

  deleteDatasource(datasourceId: string): any {
    return this.$http.delete(this.makeEndpointUrl(`/datasources/${datasourceId}`));
  }
}
