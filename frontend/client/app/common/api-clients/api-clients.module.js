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

import LibraryApi from './library-api.service';

exports.inject = function(module) {
  // base-api-client + workflows-api-client + operations-api-client + session-manager-api migrated to
  // Angular 18 (ng2/): BaseApiClient is now an Angular base class (not downgraded); the three clients
  // are downgraded in ng2/bootstrap.ts. operations.factory + operations-hierarchy stay AngularJS and
  // consume the downgraded OperationsApiClient.
  // operations-hierarchy.service migrated to Angular 18 (ng2/) — downgraded as 'OperationsHierarchyService'.
  require('./operations.factory.js').inject(module);

  module
    .service('LibraryApiService', LibraryApi);
};
