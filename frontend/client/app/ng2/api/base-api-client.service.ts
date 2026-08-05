/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Injectable, Inject } from '@angular/core';
import { HttpService } from '../core/http.service';
import { defer } from '../core/defer';

// Phase C-1: migrated from common/api-clients/base-api-client.factory.js. The legacy factory returned
// a CONSTRUCTOR that the two subclass factories extended via prototype; here it becomes a plain
// Angular base class that the migrated OperationsApiClient/WorkflowsApiClient extend. It has no direct
// AngularJS consumers, so it is NOT downgraded. Uses the bridged $http/$q and the config constant;
// still returns AngularJS ($q) promises so existing consumers' .then/.catch are unchanged (a later
// pass can move this to HttpClient/RxJS).
@Injectable({ providedIn: 'root' })
export class BaseApiClient {
  readonly METHOD_GET = 'GET';
  readonly METHOD_POST = 'POST';
  readonly METHOD_PUT = 'PUT';
  readonly METHOD_DELETE = 'DELETE';
  readonly API_URL: string;

  constructor(
    protected $http: HttpService,
    @Inject('config') protected config: any
  ) {
    this.API_URL = config.apiPort
      ? `${config.apiHost}:${config.apiPort}/${config.urlApiVersion}`
      : `${config.apiHost}/${config.urlApiVersion}`;
  }

  makeRequest(method: string, url: string, data: any = {}, timeout?: number): any {
    const deferred = defer();
    this.$http.request({
      method: method,
      url: url,
      data: data,
      timeout: timeout
    })
      .then((result: any) => {
        deferred.resolve(result.data);
      }, (error: any) => {
        deferred.reject(error);
      });

    return deferred.promise;
  }
}
