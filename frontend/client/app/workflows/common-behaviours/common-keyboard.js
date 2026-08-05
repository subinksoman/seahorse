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

import Mousetrap from 'mousetrap';

/* @ngInject */
function Keyboard($rootScope) {
  return {
    restrict: 'A',
    link: function(scope, element, attrs) {
      Mousetrap.bind(['del', 'backspace'], () => {
        // Only delete when no modal is open. All modals are CDK now (angular-ui-bootstrap removed),
        // so check the CDK overlay instead of the old $uibModalStack. (The Angular canvas uses ng2
        // KeyboardDirective; this AngularJS directive remains only for any legacy AngularJS template.)
        if (!document.querySelector('.cdk-dialog-container')) {
          $rootScope.$broadcast('Keyboard.KEY_PRESSED_DEL');
        }
        return false;
      });

      Mousetrap.bind('esc', () => {
        $rootScope.$broadcast('Keyboard.KEY_PRESSED_ESC');
      });
    }
  };
}

exports.inject = function(module) {
  module.directive('keyboard', Keyboard);
};
