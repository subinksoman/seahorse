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
function AppConfig($urlRouterProvider, toastrConfig, $cookiesProvider, $locationProvider, $qProvider) {
  // ui-router defines its four transition-rejection types (superseded/prevented/aborted/failed) as
  // $q rejections at init; it handles them internally, but AngularJS 1.6+ $q still logs them as
  // "Possibly unhandled rejection: {}". They are benign navigation noise (present on every load), so
  // disable the unhandled-rejection console logging to keep the console readable.
  $qProvider.errorOnUnhandledRejections(false);

  // AngularJS 1.6 compatibility (upgraded 1.5.11 -> 1.8.3, T81): 1.6 changed the default hash
  // prefix from '' to '!'. Keep '#/...' URLs (not '#!/...') so existing links, bookmarks and
  // proxy routes are unaffected.
  // NOTE: there is deliberately no preAssignBindingsEnabled() call here — that toggle was
  // REMOVED in Angular 1.7 (calling it throws $injector:modulerr). Under 1.7+ bindings are
  // never pre-assigned, so any controller that reads its bindings in the constructor must read
  // them in $onInit instead (see T81 notes).
  $locationProvider.hashPrefix('');

  angular.extend(toastrConfig, {
    'allowHtml': true,
    'newestOnTop': false,
    'positionClass': 'toast-bottom-left',
    'closeButton': true,
    'progressBar': true,
    'timeOut': 3500,
    'maxOpened': 5,
    'iconClasses': {
      'error': 'notification--error fa-exclamation-circle',
      'info': 'toast-info',
      'success': 'toast-success',
      'warning': 'toast-warning'
    }
  });
  $urlRouterProvider.otherwise('/');

  const expiresDate = new Date();
  expiresDate.setFullYear(expiresDate.getFullYear() + 2);
  $cookiesProvider.defaults.expires = expiresDate;
}

exports.inject = function(module) {
  module.config(AppConfig);
};
