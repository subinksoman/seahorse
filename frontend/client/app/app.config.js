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
function AppConfig($locationProvider, $qProvider) {
  // Keep unhandled-rejection console logging off — modal dismissals (uib-modal) reject their result
  // promises, which AngularJS 1.6+ would otherwise log as "Possibly unhandled rejection". Benign.
  $qProvider.errorOnUnhandledRejections(false);

  // AngularJS 1.6 compatibility (upgraded 1.5.11 -> 1.8.3, T81): 1.6 changed the default hash
  // prefix from '' to '!'. Keep '#/...' URLs (not '#!/...') so existing links, bookmarks and
  // proxy routes are unaffected.
  // NOTE: there is deliberately no preAssignBindingsEnabled() call here — that toggle was
  // REMOVED in Angular 1.7 (calling it throws $injector:modulerr). Under 1.7+ bindings are
  // never pre-assigned, so any controller that reads its bindings in the constructor must read
  // them in $onInit instead (see T81 notes).
  $locationProvider.hashPrefix('');

  // (toastrConfig removed — notifications are the native ng2 ToastService now; its bottom-left / close /
  //  progress-bar / 3.5s-timeout look is baked into toast.css.)
  // ($urlRouterProvider.otherwise('/') removed — @angular/router's { path: '**', redirectTo: '' } route
  //  now handles the fallback.)
  // ($cookiesProvider default-expiry removed — ngCookies is gone; DeleteModalService writes its
  //  "don't ask again" cookie natively with the same +2yr expiry.)
}

exports.inject = function(module) {
  module.config(AppConfig);
};
