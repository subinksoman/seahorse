/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Injectable } from '@angular/core';
import { ModalService } from './modal.service';
import { WorkflowCloneModalComponent } from './workflow-clone-modal.component';
import { WorkflowsApiClient } from './workflows-api-client.service';
import { NotificationService } from './notification.service';

// Phase C / AngularJS removal: opens the CDK WorkflowCloneModalComponent (was uib-modal), then clones
// the returned copy via the Angular WorkflowsApiClient. Public surface (openModal) unchanged;
// downgraded as 'WorkflowCloneService'.
@Injectable({ providedIn: 'root' })
export class WorkflowCloneService {
  constructor(
    private modal: ModalService,
    private workflowsApiClient: WorkflowsApiClient,
    private notificationService: NotificationService
  ) {}

  openModal(callback: (...args: any[]) => any, workflow: any): void {
    this.modal.open<any>(WorkflowCloneModalComponent, { workflow }).result.then((workflowToClone: any) => {
      if (!workflowToClone) { return; } // dismissed
      (this.workflowsApiClient as any).cloneWorkflow(workflowToClone).then(callback, () => {
        (this.notificationService as any).showWithParams({
          message: 'There was an error during copying workflow.',
          title: 'Workflow copy',
          settings: { timeOut: 10000 },
          notificationType: 'error'
        });
      });
    });
  }
}
