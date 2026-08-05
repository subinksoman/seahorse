/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Directive, Inject, OnDestroy } from '@angular/core';
import { Dialog } from '@angular/cdk/dialog';
import * as Mousetrap from 'mousetrap';

// Phase C / canvas: Angular version of workflows/common-behaviours/common-keyboard.js, for use inside the
// migrated (Angular) core-canvas template. Binds global del/backspace/esc via Mousetrap and rebroadcasts on
// the bridged $rootScope so the still-AngularJS editor controller reacts unchanged. The AngularJS directive
// stays registered for any AngularJS-template usage; selectors don't collide across the two frameworks.
@Directive({ standalone: false, selector: '[keyboard]' })
export class KeyboardDirective implements OnDestroy {
  constructor(
    @Inject('$rootScope') private $rootScope: any,
    private dialog: Dialog
  ) {
    Mousetrap.bind(['del', 'backspace'], () => {
      // Only delete the selected node when no modal is open (was $uibModalStack.getTop()).
      if (this.dialog.openDialogs.length === 0) {
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
