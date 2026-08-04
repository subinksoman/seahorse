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

/* @ngInject */
function AppRun($rootScope) {
  // Seed the shared loading flags. ui-router is gone, so the former $stateChangeStart/Success handlers
  // (reset flags, drop deepsense listeners, clear modals) now live on @angular/router NavigationStart
  // in ng2/router-shell.component.ts. showView gating is dropped (the router-outlet governs rendering).
  $rootScope.stateData = {
    showView: undefined,
    dataIsLoaded: undefined
  };
}

exports.function = AppRun;

exports.inject = function(module) {
  module.run(AppRun);
};
