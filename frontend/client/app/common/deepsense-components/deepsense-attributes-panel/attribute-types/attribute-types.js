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

// attribute-boolean-type migrated to Angular.
require('./attribute-code-snippet/attribute-code-snippet-type-modal/attribute-code-snippet-type-modal.ctrl.js'); // code-snippet migrated to Angular; modal ctrl kept for the edit-in-window modal
// attribute-selector-type + attributes-serialized-view migrated to Angular (ng2/). The modal's
// selector-items + calculated-selected-columns stay AngularJS (opened on the Angular component's child scope):
require('./attribute-column-selector/calculated-selected-columns/calculated-selected-columns.js');
require('./attribute-column-selector/selector-items/selector-items.js');
// migrated to Angular (ng2/) — downgraded.
// migrated to Angular (recursive core).
// migrated to Angular (recursive core).
// attribute-load-from-library (+library-connector) migrated to Angular.
// (library-connector migrated with load-from-library)
// migrated to Angular (recursive core).
// migrated to Angular (ng2/) — downgraded.
// migrated to Angular (recursive core).
// attribute-numeric-type migrated to Angular (app/ng2/attribute-numeric-type.component.ts) — downgraded 'attributeNumericType'.
// migrated to Angular (ng2/) — downgraded.
// attribute-save-to-library migrated to Angular.
// migrated to Angular (recursive core).
// attribute-string-type migrated to Angular (app/ng2/attribute-string-type.component.ts) — downgraded 'attributeStringType'.
// migrated to Angular (ng2/) — downgraded.
// attribute-datasource migrated to Angular.
