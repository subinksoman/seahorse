/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Injectable, Inject } from '@angular/core';
import { HttpService } from './http.service';
import { BaseApiClient } from './base-api-client.service';

// Phase C-1: migrated from common/api-clients/operations-api-client.factory.js. Extends the Angular
// BaseApiClient (the legacy factory extended it via prototype and returned an instance). The explicit
// constructor forwards the base deps to super() so DI is unambiguous under the JIT compiler. Public
// surface (getAll/get/getCatalog/getHierarchy) unchanged; downgraded as 'OperationsApiClient'.
@Injectable({ providedIn: 'root' })
export class OperationsApiClient extends BaseApiClient {
  private readonly PATH_OPERATIONS = '/operations';
  private readonly PATH_CATALOG = '/operations/catalog';
  private readonly PATH_HIERARCHY = '/operations/hierarchy';

  constructor(
    $http: HttpService,
    @Inject('config') config: any
  ) {
    super($http, config);
  }

  getAll(): any {
    return this.makeRequest(this.METHOD_GET, this.API_URL + this.PATH_OPERATIONS);
  }

  get(id: string): any {
    return this.makeRequest(this.METHOD_GET, this.API_URL + this.PATH_OPERATIONS + '/' + id);
  }

  getCatalog(): any {
    return this.makeRequest(this.METHOD_GET, this.API_URL + this.PATH_CATALOG);
  }

  getHierarchy(): any {
    return this.makeRequest(this.METHOD_GET, this.API_URL + this.PATH_HIERARCHY);
  }
}
