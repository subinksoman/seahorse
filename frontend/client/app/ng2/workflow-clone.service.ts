/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Injectable, Inject } from '@angular/core';
import tpl from '../common/modals/workflow-clone-modal/workflow-clone-modal.html';
import { WorkflowsApiClient } from './workflows-api-client.service';
import { NotificationService } from './notification.service';

declare const angular: any; // global (expose-loader) — used for angular.copy of the workflow

// Phase C-1: migrated from common/modals/workflow-clone-modal/workflow-clone-modal.srv.js. Now fully
// clean — both real deps are already-migrated Angular services (WorkflowsApiClient, NotificationService,
// injected DIRECTLY as classes); only $uibModal is bridged. Template + WorkflowCloneModalCtrl stay
// AngularJS. Public surface (openModal) unchanged; downgraded as 'WorkflowCloneService'.
@Injectable({ providedIn: 'root' })
export class WorkflowCloneService {
  constructor(
    @Inject('$uibModal') private $uibModal: any,
    @Inject('$rootScope') private $rootScope: any,
    private workflowsApiClient: WorkflowsApiClient,
    private notificationService: NotificationService
  ) {}

  openModal(callback: (...args: any[]) => any, workflow: any): void {
    // WorkflowCloneModalCtrl folded in via the child-scope trick: scope.controller carries the original
    // + an angular.copy renamed "Copy of …" that the template edits, plus save/dismiss.
    const scope = this.$rootScope.$new();
    const workflowCopy = angular.copy(workflow);
    workflowCopy.name = `Copy of ${workflowCopy.name}`;
    scope.controller = { originalWorkflow: workflow, workflowCopy };
    const modal = this.$uibModal.open({
      animation: true,
      templateUrl: tpl,
      scope,
      backdrop: 'static',
      keyboard: true
    });
    scope.controller.save = () => modal.close(scope.controller.workflowCopy);
    scope.controller.dismiss = () => modal.dismiss();
    modal.result.finally(() => scope.$destroy());

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
