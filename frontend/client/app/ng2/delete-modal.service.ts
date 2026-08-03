/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Injectable, Inject } from '@angular/core';
import tpl from '../common/modals/delete-modal/delete-modal.html';

// Phase C-1: migrated from common/modals/delete-modal/delete-modal.service.js. Guards a delete with
// a "don't ask again" cookie ($cookies, bridged) and, when needed, a confirmation modal ($uibModal,
// bridged); template + DeleteConfirmationModalController stay AngularJS. Public surface (handleDelete)
// unchanged; downgraded as 'DeleteModalService'.
@Injectable({ providedIn: 'root' })
export class DeleteModalService {
  constructor(
    @Inject('$uibModal') private $uibModal: any,
    @Inject('$cookies') private $cookies: any
  ) {}

  handleDelete(deleteHandler: (...args: any[]) => any, cookieName: string): void {
    if (this.$cookies.get(cookieName) !== 'true') {
      this.openDeleteModal()
        .then((cookieValue: any) => {
          return cookieValue ? this.$cookies.put(cookieName, 'true') : false;
        })
        .then(deleteHandler);
    } else {
      deleteHandler();
    }
  }

  private openDeleteModal(): any {
    return this.$uibModal.open({
      animation: false,
      templateUrl: tpl,
      controller: 'DeleteConfirmationModalController',
      controllerAs: 'controller',
      backdrop: 'static',
      keyboard: true
    }).result;
  }
}
