/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Directive, Inject, OnDestroy } from '@angular/core';
import * as Mousetrap from 'mousetrap';
import * as _ from 'lodash';

// Phase C / canvas: Angular version of workflows/common-behaviours/common-keyboard.js, for use inside the
// migrated (Angular) core-canvas template. Binds global del/backspace/esc via Mousetrap and rebroadcasts on
// the bridged $rootScope so the still-AngularJS editor controller reacts unchanged. The AngularJS directive
// stays registered for any AngularJS-template usage; selectors don't collide across the two frameworks.
@Directive({ standalone: false, selector: '[keyboard]' })
export class KeyboardDirective implements OnDestroy {
  constructor(
    @Inject('$rootScope') private $rootScope: any,
    @Inject('$uibModalStack') private $uibModalStack: any
  ) {
    Mousetrap.bind(['del', 'backspace'], () => {
      if (_.isUndefined(this.$uibModalStack.getTop())) {
        this.$rootScope.$broadcast('Keyboard.KEY_PRESSED_DEL');
      }
      return false;
    });
    Mousetrap.bind('esc', () => {
      this.$rootScope.$broadcast('Keyboard.KEY_PRESSED_ESC');
    });
  }

  ngOnDestroy(): void {
    Mousetrap.unbind(['del', 'backspace']);
    Mousetrap.unbind('esc');
  }
}
