/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Injectable, Inject } from '@angular/core';
import { HttpService } from './http.service';
import { identity } from './ng-compat';

// Phase C-1: migrated from common/api-clients/library-api.service.js. Thin $http client for the
// /library endpoint (list/add/remove/upload + resource URI/URL helpers). Uses bridged $http + the
// config constant. The legacy Symbol-keyed private fields become plain private fields (never accessed
// externally). Public surface unchanged; downgraded as 'LibraryApiService'.
@Injectable({ providedIn: 'root' })
export class LibraryApi {
  private url: string;
  private libraryPrefix: string;

  constructor(
    private $http: HttpService,
    @Inject('config') config: any
  ) {
    this.url = `${config.apiHost}:${config.apiPort}/library`;
    this.libraryPrefix = config.libraryPrefix;
  }

  addDirectory(directoryName: string, parentDirectoryPath: string): any {
    const separator = parentDirectoryPath.endsWith('/') ? '' : '/';
    const directoryPath = `${parentDirectoryPath}${separator}${directoryName}`;
    return this.$http.post(this.getResourceUrl(directoryPath));
  }

  /** @returns {Promise} */
  getAll(): any {
    return this.$http
      .get(this.url)
      .then((result: any) => {
        return result.data;
      });
  }

  getResourceUri(resourcePath: string): string {
    // Dirty hack
    return `${this.libraryPrefix}${resourcePath}`.replace('///', '//');
  }

  getResourceUrl(resourcePath: string): string {
    return `${this.url}${resourcePath}`;
  }

  removeDirectory(directoryPath: string): any {
    return this.$http.delete(this.getResourceUrl(directoryPath));
  }

  // TODO: combine removeFile and removeDirectory into method removeResource
  //       use resourcePath as input and generate resource URL internally
  removeFile(fileUrl: string): any {
    return this.$http.delete(fileUrl);
  }

  uploadFile(file: any, directoryPath: string, progressHandler: (p: number) => void): any {
    const fd = new FormData();
    const directoryUrl = this.getResourceUrl(directoryPath);

    fd.append('file', file);
    return this.$http
      .post(directoryUrl, fd, {
        transformRequest: identity,
        headers: { 'Content-Type': undefined },
        uploadEventHandlers: {
          progress: function (param: any) {
            const uploadProgress = Math.ceil(param.loaded / param.total * 100);
            progressHandler(uploadProgress);
          }
        }
      });
  }
}
