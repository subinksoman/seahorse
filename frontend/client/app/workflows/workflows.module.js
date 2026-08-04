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

let angular = require('angular');

let workflows = angular.module('ds.workflows', [
  require('./reports/reports.module.js').name,
  require('./editor/editor.module.js')
]);

require('./workflows.config.js').inject(workflows);
// workflows.service (WorkflowService hub) migrated to Angular 18 (ng2/workflow.service.ts) — downgraded as 'WorkflowService'.
require('./common-behaviours/common-behaviours.module.js').inject(workflows);
require('./graph-panel/graph-panel.module.js').inject(workflows);
require('./inner-workflows/public-param/public-params-list.js').inject(workflows);
// default-inner-workflow-generator.service migrated to Angular 18 (ng2/) — downgraded as 'DefaultInnerWorkflowGenerator'.
require('./workflows-editor/workflows-editor.module.js').inject(workflows);
// workflows-editor-status-bar (drv+ctrl) migrated to Angular (ng2/workflows-editor-status-bar.component.ts)
// — downgraded 'workflowEditorStatusBar'. workflows-editor-status-bar.service already Angular
// (ng2/workflow-status-bar.service.ts, downgraded 'WorkflowStatusBarService').
require('./workflows-status-bar/documentation-link/documentation-link.directive.js').inject(workflows);
// selection-items migrated to Angular (ng2/selection-items.component.ts) — downgraded 'selectionItems'.

require('./general-data-panel/general-data-panel.module.js').inject(workflows);
// copy-paste migrated to Angular 18 (ng2/copy-paste.service.ts) — downgraded as 'CopyPasteService'.
// menu-item + the 3 additional-html popovers migrated to Angular (ng2/menu-item.component.ts +
// ng2/status-bar-popovers.component.ts). menu-item's <ng-include> of a dynamic popover template URL
// became an *ngSwitch on a popover key -> downgraded popover components.
// bottom-bar migrated to Angular (ng2/bottom-bar.component.ts) — downgraded as directive 'bottomBar'.
// bottom-bar.service migrated to Angular 18 (ng2/bottom-bar.service.ts) — downgraded as 'BottomBarService'.
// session-manager.service migrated to Angular 18 (ng2/session-manager.service.ts) — downgraded as 'SessionManager'.
// navigation-bar migrated to Angular (ng2/navigation-bar.component.ts) — downgraded 'navigationBar'.
require('./cluster-settings-modals/choose-cluster-modal.ctrl.js').inject(workflows);
// cluster-modal.srv migrated to Angular 18 (ng2/cluster-modal.service.ts) — downgraded as 'ClusterModalService'.
require('./cluster-settings-modals/preset-modal/preset-modal.controller.js').inject(workflows);
require('./cluster-settings-modals/preset-modal/preset-modal-labels.js').inject(workflows);
require('./library/library-modal.controller.js').inject(workflows);
// library-modal.service migrated to Angular 18 (ng2/library-modal.service.ts) — downgraded as 'LibraryModalService'.
require('./library/file-upload-section/file-upload-change.directive.js').inject(workflows);
require('./library/file-upload-section/dropzone-file-upload.directive.js').inject(workflows);

module.exports = workflows;
