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

'use strict';

import angular from 'angular';

import OperationsCatalogueModule from '../operations-catalogue/operations-catalogue.module.js';

import CanvasToolbarComponent from './canvas-toolbar/canvas-toolbar.component.js';
import CanvasComponent from './core-canvas/canvas.component.js';
// new-node migrated to Angular (ng2/new-node.component.ts) — downgraded as directive 'newNode'.
import EditorComponent from './editor.component.js';
// graph-node migrated to Angular (ng2/graph-node.component.ts) — downgraded as directive 'graphNode'.
// status-icon migrated to Angular (ng2/status-icon.component.ts) — downgraded as directive 'statusIcon'.
// port-status-tooltip migrated to Angular 18 (ng2/port-status-tooltip.component.ts) — downgraded as directive 'portStatusTooltip'.
// create-node-invitation migrated to Angular 18 (ng2/create-node-invitation.component.ts) — downgraded as directive 'createNodeInvitation'.
import AdapterService from './core-canvas/adapter.service.js';
import CanvasService from './core-canvas/canvas.service.js';
import GraphStyleService from './core-canvas/graph-node/graph-style.service.js';

const appModule = angular
  .module('editor', [
    OperationsCatalogueModule
  ])
  .service('CanvasService', CanvasService)
  .service('AdapterService', AdapterService)
  .service('GraphStyleService', GraphStyleService)
  .component('canvasToolbar', CanvasToolbarComponent)
  .component('coreCanvas', CanvasComponent)
  .component('editor', EditorComponent)
  // graphNode + statusIcon + portStatusTooltip + createNodeInvitation migrated to Angular — registered as downgraded directives in ng2/bootstrap.ts.
  .name;

export default appModule;
