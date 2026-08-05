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

require('angular');
// angular-cookies removed — DeleteModalService reads/writes its cookie via document.cookie natively.
// angular-debounce removed — the 2 ng2 debounce users (WorkflowService save, multi-selection viewFix) use lodash _.debounce; the AngularJS debounce injectors are dead/unbundled.
// angular-sanitize removed — no ngSanitize dependency (see preset-modal $sce.trustAsHtml).
// angular-toastr removed — notifications are the native ng2 ToastService (toast.service.ts + toast.css).
// angular-ui-ace removed — the code-snippet + cell-viewer editors are Angular now and drive ACE
// (ace-builds, still required below) directly via ace.edit(); the ui-ace directive is unused.
// angular-ui-router removed — routing is now @angular/router (see ng2/app-routes.ts).
// angular-ui-bootstrap removed — all modals are @angular/cdk (ng2/modal.service.ts); tooltips/popovers
// are native title / CSS in the migrated Angular components.
// angular-xeditable removed — general-data-panel (the only inline-edit user) is an Angular component
// with native inputs; no editable-text directive is compiled anymore.
// angucomplete-alt removed — the only user was the column-selector, now the native Angular
// ColumnSelectorModalComponent autocomplete (CDK). The directive is unused.
require('ace-builds/src-min-noconflict/ace.js');
require('font-awesome/css/font-awesome.css');
require('jquery');
require('lodash');
require('imports-loader?type=commonjs&wrapper=window!malihu-custom-scrollbar-plugin');
require('ng-file-upload');
// ng-switchery removed — the only user (attribute-multiple-choice) is an Angular component with a native
// CSS toggle. (Its loader shim in config/webpack/global.js is now inert — no module matches it.)
require('sockjs-client');
require('stompjs');
require('d3');
require('nvd3');
