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

// operations-catalogue cluster fully migrated to Angular (ng2/operations-catalogue.component.ts,
// operations-list.component.ts, search-operation.component.ts, operations-catalogue.service.ts) —
// operationCatalogue is downgraded as a directive in ng2/bootstrap.ts; its children + the service are
// Angular-only. This module is kept (empty) because editor.module.js lists it as a dependency.
const Operations = angular
  .module('operations-catalogue', [])
  .name;

export default Operations;
