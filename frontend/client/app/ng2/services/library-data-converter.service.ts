/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Injectable } from '@angular/core';
import { LibraryApi } from '../api/library-api.service';

// Phase C-1: migrated from common/services/library-data-converter.service.js. Decodes the library API
// response into a Map of resource objects (directories/files) with lazy uri/downloadUrl getters that
// call the (now Angular) LibraryApi. NOTE: inside those Object.create getters `this` is the resource
// object, not the service — so each factory method captures the injected client in a local
// (libraryApi) that the getters close over. Public surface unchanged; downgraded as
// 'LibraryDataConverterService'.
@Injectable({ providedIn: 'root' })
export class LibraryDataConverter {
  constructor(private libraryApi: LibraryApi) {}

  decodeResponseData(data: any): any {
    const library: any = new Map();
    const ROOT_DIRECTORY_URI = this.addDirectoryToLibrary(library, data).uri;

    library.getRootDirectory = function getRootDirectory() {
      return library.get(ROOT_DIRECTORY_URI);
    };

    return library;
  }

  private addDirectoryToLibrary(library: any, directoryData: any, parentDirectory?: any): any {
    const directory = this.makeLibraryDirectory(directoryData, parentDirectory);

    library.set(directory.uri, directory);

    directory.items = directoryData.children.map((child: any) => {
      if (child.kind === 'file') {
        return this.makeLibraryFile(child, directory);
      } else {
        return this.addDirectoryToLibrary(library, child, directory);
      }
    });

    return directory;
  }

  private makeLibraryResource(resourceData: any = {}, parentDirectory: any = null): any {
    const libraryApi = this.libraryApi; // captured — `this` inside the getters is the resource object
    return Object.create({
      isDirectory: function isDirectory(this: any) {
        return this.kind === 'directory';
      },
      isFile: function isFile(this: any) {
        return this.kind === 'file';
      },
      isRoot: function isRoot(this: any) {
        return this.isDirectory() && !this.parent;
      },
      toString: function toString(this: any) {
        return this.path;
      }
    }, {
      kind: { value: resourceData.kind, enumerable: true },
      name: { value: resourceData.name, enumerable: true },
      parent: { value: parentDirectory, enumerable: true },
      parents: {
        get: function getParents(this: any) {
          if (this.isRoot()) {
            return [];
          }
          return [...this.parent.parents, this.parent];
        }
      },
      path: {
        get: function getPath(this: any) {
          if (this.isRoot()) {
            return '/';
          }
          if (this.parent.isRoot()) {
            return `/${this.name}`;
          }
          return `${this.parent.path}/${this.name}`;
        }
      },
      // TODO: remove uri property, use path instead
      uri: {
        get: function (this: any) {
          return libraryApi.getResourceUri(this.path);
        }
      }
    });
  }

  private makeLibraryDirectory(directoryData: any, parentDirectory?: any): any {
    return this.makeLibraryResource(directoryData, parentDirectory);
  }

  makeLibraryFile(fileData: any, parentDirectory?: any, extraParams?: any): any {
    const libraryApi = this.libraryApi; // captured — see makeLibraryResource
    return Object.assign(
      Object.create(this.makeLibraryResource(fileData, parentDirectory), {
        downloadUrl: {
          get: function (this: any) {
            return libraryApi.getResourceUrl(this.path);
          }
        }
      }),
      extraParams
    );
  }
}
