/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Injectable, Inject } from '@angular/core';
import tpl from '../common/modals/confirmation-modal/confirmation-modal.html';

// Phase C-1: migrated from common/modals/confirmation-modal/confirmation-modal.service.js. Opens the
// confirmation modal via angular-ui-bootstrap ($uibModal, bridged). The modal TEMPLATE stays AngularJS
// (uib-modal), but the former ConfirmationModalController is now folded in via the child-scope trick:
// a fresh $rootScope child scope carries `controller` (message + ok/close) so the template is unchanged
// and no AngularJS controller registration is needed. Downgraded as 'ConfirmationModalService'.
@Injectable({ providedIn: 'root' })
export class ConfirmationModalService {
  constructor(
    @Inject('$uibModal') private $uibModal: any,
    @Inject('$rootScope') private $rootScope: any
  ) {}

  showModal(options: { message: string } = { message: '' }): any {
    const scope = this.$rootScope.$new();
    scope.controller = { message: options.message };
    const modal = this.$uibModal.open({
      animation: true,
      templateUrl: tpl,
      scope,
      backdrop: 'static',
      keyboard: true
    });
    scope.controller.close = () => modal.dismiss();
    scope.controller.ok = () => modal.close();
    modal.result.finally(() => scope.$destroy());
    return modal.result;
  }
}
