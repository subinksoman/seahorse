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

// canvas-toolbar migrated to Angular (ng2/canvas-toolbar.component.ts) — downgraded as directive 'canvasToolbar'.
// core-canvas migrated to Angular (ng2/core-canvas.component.ts) — downgraded as directive 'coreCanvas';
// its keyboard/jsplumb-draggable/multi-selection directives are Angular directives in ng2/.
// new-node migrated to Angular (ng2/new-node.component.ts) — downgraded as directive 'newNode'.
// editor migrated to Angular (ng2/editor.component.ts) — downgraded as directive 'editor'.
// graph-node migrated to Angular (ng2/graph-node.component.ts) — downgraded as directive 'graphNode'.
// status-icon migrated to Angular (ng2/status-icon.component.ts) — downgraded as directive 'statusIcon'.
// port-status-tooltip migrated to Angular 18 (ng2/port-status-tooltip.component.ts) — downgraded as directive 'portStatusTooltip'.
// create-node-invitation migrated to Angular 18 (ng2/create-node-invitation.component.ts) — downgraded as directive 'createNodeInvitation'.
// AdapterService migrated to native ng2 (ng2/adapter.service.ts) — aliased in bootstrap.ts.
// CanvasService migrated to native ng2 (ng2/canvas.service.ts) — aliased in bootstrap.ts.
// GraphStyleService migrated to native ng2 (ng2/graph-style.service.ts) — downgraded as 'GraphStyleService'
// in bootstrap.ts for the AngularJS canvas adapter; ng2 consumers use the class.

const appModule = angular
  .module('editor', [
    OperationsCatalogueModule
  ])
  // All editor components AND services (canvas/adapter/graph-style) migrated to Angular (ng2/) — the
  // components are downgraded directives, the services are native ng2 aliased/downgraded in bootstrap.ts.
  // This AngularJS module now only re-exports the (still-AngularJS) OperationsCatalogueModule.
  .name;

export default appModule;
