/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Injectable, Inject } from '@angular/core';
import tpl from '../common/modals/confirmation-modal/confirmation-modal.html';

// Phase C-1: migrated from common/modals/confirmation-modal/confirmation-modal.service.js. Opens the
// confirmation modal via angular-ui-bootstrap ($uibModal, bridged). The modal template + its
// ConfirmationModalController remain AngularJS. Public surface (showModal) unchanged; downgraded as
// 'ConfirmationModalService'.
@Injectable({ providedIn: 'root' })
export class ConfirmationModalService {
  constructor(@Inject('$uibModal') private $uibModal: any) {}

  showModal(options: { message: string } = { message: '' }): any {
    const modal = this.$uibModal.open({
      animation: true,
      templateUrl: tpl,
      controller: 'ConfirmationModalController as controller',
      backdrop: 'static',
      keyboard: true,
      resolve: {
        message: () => options.message
      }
    });

    return modal.result;
  }
}
