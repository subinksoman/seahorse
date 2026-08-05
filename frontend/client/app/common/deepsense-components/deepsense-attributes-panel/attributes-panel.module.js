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

const attributesPanel = angular.module('deepsense.attributes-panel', [
  'deepsense.spinner',
  'deepsense.node-parameters',
  // 'ui.bootstrap' removed — the panel + attribute-types are Angular components now (CDK modals,
  // native tooltips); no uib directive is compiled at runtime.
  'xeditable',
  'NgSwitchery'
  // 'ui.ace' + 'angucomplete-alt' removed — code-snippet drives ACE natively, column-selector is the
  // native CDK ColumnSelectorModalComponent; neither directive is compiled anymore.
]).run((editableOptions) => {
  editableOptions.theme = 'bs3';
});

require('./attribute-types/attribute-types.js');
// attributes-list migrated to Angular (ng2/attributes-list.component.ts) — downgraded 'attributesList'.
// attributes-panel (deepsenseOperationAttributes) migrated to Angular (ng2/attributes-panel.component.ts).
// Its service stays AngularJS (bridged to Angular, used by attributes-list + attribute-datasource + the
// panel) — re-registered directly now that the migrated directive no longer requires it transitively.
require('./attributes-panel/attributes-panel.service.js');
require('./common/common.js');

module.exports = attributesPanel;
