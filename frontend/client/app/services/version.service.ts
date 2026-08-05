/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Injectable, Inject } from '@angular/core';

// Phase C-1: migrated from version.factory.js. Reads the AngularJS 'config' constant (injected via
// the upgraded 'config' provider), which is the static config merged with window.dockerConfig at
// bootstrap. Public surface (getDocsVersion(), editorVersion) is unchanged; downgraded as 'version'.
@Injectable({ providedIn: 'root' })
export class VersionService {
  constructor(@Inject('config') private config: any) {}

  getDocsVersion(): string {
    return this.config.apiVersion.split('.').slice(0, 2).join('.');
  }

  get editorVersion(): string {
    return this.config.editorVersion;
  }
}
