/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Injectable, Inject } from '@angular/core';
import * as _ from 'lodash';
import CurrentDirectory from '../common/services/current-directory';
import { LibraryDataConverter } from './library-data-converter.service';
import { LibraryApi } from './library-api.service';

declare const angular: any; // global (expose-loader) — angular.isArray

const STATUS_UPLOADING = 'uploading';
const STATUS_ERROR = 'error';
const STATUS_COMPLETE = 'complete';

// Phase C-1: migrated from common/services/library.service.js. Owns the client-side library model:
// current directory, uploads-in-progress, fetch/add/remove/upload against the (now Angular) LibraryApi,
// decoding via the Angular LibraryDataConverter. $q/$log bridged. Legacy closure state becomes instance
// fields; fetchAll() runs on construction (lazy first injection), matching the legacy factory.
// getUploadingFiles (+ sibling state getters) are $watch-ed detached, so they are bound in the
// constructor. Public surface unchanged; downgraded as 'LibraryService'.
@Injectable({ providedIn: 'root' })
export class LibraryService {
  private uploading: any[] = [];
  private currentDirectory: any = new CurrentDirectory();
  private library: any;
  private currentDirectoryUri: any;
  private lastSearch: any = { directory: null, parrern: null, results: null };

  constructor(
    @Inject('$q') private $q: any,
    @Inject('$log') private $log: any,
    private libraryDataConverterService: LibraryDataConverter,
    private libraryApiService: LibraryApi
  ) {
    // These are passed detached to $watch/$watchCollection (status-bar, recent-files-indicator);
    // the legacy service used closures (no `this`), so bind the state getters.
    this.getUploadingFiles = this.getUploadingFiles.bind(this);
    this.isUploadingInProgress = this.isUploadingInProgress.bind(this);
    this.getCurrentDirectory = this.getCurrentDirectory.bind(this);
    this.getCurrentDirectoryContent = this.getCurrentDirectoryContent.bind(this);
    this.getAll = this.getAll.bind(this);

    this.fetchAll();
  }

  addDirectory(directoryName: string): any {
    this.$log.info(`LibraryService.addDirectory(${directoryName})`);
    return this.libraryApiService
      .addDirectory(directoryName, this.currentDirectory.path)
      .then((result: any) => {
        this.fetchAll();
        return result;
      });
  }

  changeDirectory(directoryUri: string): void {
    const newDirectory = this.library.get(directoryUri) || this.library.getRootDirectory();
    this.currentDirectory.changeTo(newDirectory);
    // TODO: remove
    this.currentDirectoryUri = this.currentDirectory.uri;
  }

  /** Fetches library from the server to local object. @returns {Promise} */
  fetchAll(): any {
    return this.libraryApiService
      .getAll()
      .then((results: any) => {
        this.library = this.libraryDataConverterService.decodeResponseData(results);
        this.changeDirectory(this.currentDirectory.uri);
        return this.library;
      });
  }

  getAll(): any {
    return this.library;
  }

  getCurrentDirectory(): any {
    return this.currentDirectory;
  }

  getCurrentDirectoryContent(): any {
    return this.currentDirectory.items;
  }

  getFileByURI(uri: string): any {
    const parsedUri = /(library:\/\/)(.*)/.exec(uri);
    if (!parsedUri) {
      return false;
    }

    const [fileName, items] = (
      (parts: any) => (
        (prefix: any, path: any) => [path.pop(), this.library.get(`${prefix}${path.join('/')}`).items]
      )(parts[0], parts[1].split('/'))
    )(parsedUri.slice(1));

    return _.find(items, { name: fileName });
  }

  getUploadingFiles(): any[] {
    return this.uploading;
  }

  isUploadingInProgress(): boolean {
    return this.uploading
      .filter((value) => value.status === 'uploading')
      .length > 0;
  }

  removeDirectory(directory: any): any {
    this.$log.info(`LibraryService.removeDirectory(${directory})`);
    return this.libraryApiService
      .removeDirectory(directory.path)
      .then((result: any) => {
        this.fetchAll();
        return result;
      });
  }

  removeFile(file: any): any {
    this.$log.info(`LibraryService.removeFile(${file})`);
    return this.libraryApiService
      .removeFile(file.downloadUrl)
      .then((result: any) => {
        this.fetchAll();
        return result;
      });
  }

  removeUploadingFile(file: any): any {
    return _.remove(this.uploading, (uploadedFile: any) => uploadedFile.uri === file.uri);
  }

  setFilter(filter: any): void {
    this.$log.info(`LibraryService.setFilter(${filter})`);
    this.currentDirectory.setFilter(filter);
    this.$log.info(`> filter set to [${this.currentDirectory.filter}]`);
  }

  private uploadFile(file: any): any {
    this.$log.info(`LibraryService.uploadFile(${file})`);

    const uploadingFile = this.libraryDataConverterService.makeLibraryFile({
      kind: 'file',
      name: file.name
    },
      this.currentDirectory.directory,
      {
        progress: 0,
        status: STATUS_UPLOADING
      }
    );

    const progressHandler = function (progress: number) {
      uploadingFile.progress = progress;
      if (progress === 100) {
        uploadingFile.status = STATUS_COMPLETE;
      } else {
        uploadingFile.status = STATUS_UPLOADING;
      }
    };

    const alreadyUploadedIndex = this.uploading.findIndex((uploaded) => uploaded.path === uploadingFile.path);

    if (alreadyUploadedIndex > -1) {
      this.uploading.splice(alreadyUploadedIndex, 1);
    }
    this.uploading.push(uploadingFile);

    return this.libraryApiService
      .uploadFile(file, this.currentDirectory.path, progressHandler)
      .then((result: any) => {
        this.fetchAll();
        return result;
      }, (error: any) => {
        uploadingFile.status = STATUS_ERROR;
        this.$log.error('Uplading failed for file ', file, error);
        throw error;
      });
  }

  uploadFiles(files: any): any {
    this.$log.info(`LibraryService.uploadFiles(${files})`);

    let promisesArray: any[] = [];
    if (angular.isArray(files)) {
      promisesArray = files.map((file: any) => {
        return this.uploadFile(file);
      });
    } else {
      this.$log.error('FilesList is not an array');
    }
    return this.$q.all(promisesArray);
  }

  doesDirectoryAlreadyExists(directoryName: string): boolean {
    return this.currentDirectory.containsDirectory(directoryName);
  }
}
