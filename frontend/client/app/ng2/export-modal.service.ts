/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Injectable, Inject } from '@angular/core';
import tpl from '../common/modals/export-modal/export-modal.html';

// Phase C-1: migrated from common/modals/export-modal/export-modal.service.js. Opens the export
// modal via angular-ui-bootstrap ($uibModal, bridged); template + ExportModalController stay
// AngularJS. Public surface (showModal) unchanged; downgraded as 'ExportModalService'.
@Injectable({ providedIn: 'root' })
export class ExportModalService {
  constructor(@Inject('$uibModal') private $uibModal: any) {}

  showModal(): any {
    const modal = this.$uibModal.open({
      windowClass: 'seahorse-modal-wrapper',
      animation: true,
      templateUrl: tpl,
      controller: 'ExportModalController',
      controllerAs: '$ctrl',
      backdrop: 'static',
      keyboard: true
    });

    return modal.result;
  }
}
