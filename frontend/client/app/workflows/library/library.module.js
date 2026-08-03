/**
 * Copyright 2017 deepsense.ai (CodiLime, Inc)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import angular from 'angular';
// breadcrumbs migrated to Angular 18 (ng2/breadcrumbs.component.ts) — downgraded as directive 'breadcrumbs'.
// FileList migrated to Angular 18 (ng2/file-list.component.ts) — downgraded directive 'fileList'.
// FileElement migrated to Angular 18 (ng2/file-element.component.ts) — downgraded directive 'fileElement'.
// RecentFilesIndicator migrated to Angular 18 (ng2/recent-files-indicator.component.ts) — downgraded directive 'recentFilesIndicator'.
import FileUploadSection from './file-upload-section/file-upload-section.component';

const Library = angular
  .module('library', [])
  // breadcrumbs migrated to Angular 18 — registered as a downgraded directive in ng2/bootstrap.ts.
  .component('fileUploadSection', FileUploadSection)
  .name;

export default Library;
