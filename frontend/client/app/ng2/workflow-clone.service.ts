/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Injectable, Inject } from '@angular/core';
import tpl from '../common/modals/workflow-clone-modal/workflow-clone-modal.html';
import { WorkflowsApiClient } from './workflows-api-client.service';
import { NotificationService } from './notification.service';

// Phase C-1: migrated from common/modals/workflow-clone-modal/workflow-clone-modal.srv.js. Now fully
// clean — both real deps are already-migrated Angular services (WorkflowsApiClient, NotificationService,
// injected DIRECTLY as classes); only $uibModal is bridged. Template + WorkflowCloneModalCtrl stay
// AngularJS. Public surface (openModal) unchanged; downgraded as 'WorkflowCloneService'.
@Injectable({ providedIn: 'root' })
export class WorkflowCloneService {
  constructor(
    @Inject('$uibModal') private $uibModal: any,
    private workflowsApiClient: WorkflowsApiClient,
    private notificationService: NotificationService
  ) {}

  openModal(callback: (...args: any[]) => any, workflow: any): void {
    const modal = this.$uibModal.open({
      animation: true,
      templateUrl: tpl,
      controller: 'WorkflowCloneModalCtrl',
      controllerAs: 'controller',
      backdrop: 'static',
      keyboard: true,
      resolve: {
        originalWorkflow: () => workflow
      }
    });

    modal.result.then((workflowToClone: any) => {
      this.workflowsApiClient.cloneWorkflow(workflowToClone).then(callback, () => {
        this.notificationService.showWithParams({
          message: 'There was an error during copying workflow.',
          title: 'Workflow copy',
          settings: { timeOut: 10000 },
          notificationType: 'error'
        });
      });
    });
  }
}
