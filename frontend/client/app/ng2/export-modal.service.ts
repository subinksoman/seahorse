/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Injectable, Inject } from '@angular/core';
import tpl from '../common/modals/export-modal/export-modal.html';
import { WorkflowsApiClient } from './workflows-api-client.service';

declare const $: any; // jQuery global

// Phase C-1: migrated from common/modals/export-modal/export-modal.service.js. Opens the export modal
// via angular-ui-bootstrap ($uibModal, bridged). The former ExportModalController is folded in via the
// child-scope trick: scope.$ctrl carries includeDatasources + close/download (download appends a hidden
// iframe with the workflow-download URL — an iframe avoids Firefox dropping the WebSocket on link click).
// Template stays AngularJS. Downgraded as 'ExportModalService'.
@Injectable({ providedIn: 'root' })
export class ExportModalService {
  constructor(
    @Inject('$uibModal') private $uibModal: any,
    @Inject('$rootScope') private $rootScope: any,
    @Inject('$stateParams') private $stateParams: any,
    private workflowsApiClient: WorkflowsApiClient
  ) {}

  showModal(): any {
    const scope = this.$rootScope.$new();
    scope.$ctrl = {
      includeDatasources: undefined,
      download: () => {
        const url = (this.workflowsApiClient as any)
          .getDownloadWorkflowMethodUrl(this.$stateParams.id, scope.$ctrl.includeDatasources);
        $('body').append(`<iframe style="display: none" src="${url}"></iframe>`);
        scope.$ctrl.close();
      }
    };
    const modal = this.$uibModal.open({
      windowClass: 'seahorse-modal-wrapper',
      animation: true,
      templateUrl: tpl,
      scope,
      backdrop: 'static',
      keyboard: true
    });
    scope.$ctrl.close = () => modal.dismiss();
    modal.result.finally(() => scope.$destroy());
    return modal.result;
  }
}
