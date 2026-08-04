/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Injectable, Inject, inject } from '@angular/core';
import { ActivatedRouteSnapshot, Router, ResolveFn } from '@angular/router';
import { WorkflowService } from './workflow.service';
import { OperationsService } from './operations.service';
import { OperationsHierarchyService } from './operations-hierarchy.service';
import { UserService } from './user.service';
import { NotificationService } from './notification.service';

// Phase C / router inversion: the editor route's data resolver — the @angular/router replacement for
// the ui-router `workflowWithResults` resolve (workflows-editor.config.js). Downloads the workflow +
// loads operations/hierarchy, inits ServerCommunication (owner only) + initRootWorkflow, then stashes
// the result on $rootScope._workflowWithResults (WorkflowsEditorComponent.ngOnInit reads it) and flags
// dataIsLoaded. Runs BEFORE the editor component activates, preserving the async gate.
@Injectable({ providedIn: 'root' })
export class WorkflowResolver {
  constructor(
    @Inject('$rootScope') private $rootScope: any,
    @Inject('ServerCommunication') private serverCommunication: any,
    private workflowService: WorkflowService,
    private operations: OperationsService,
    private operationsHierarchy: OperationsHierarchyService,
    private userService: UserService,
    private notificationService: NotificationService,
    private router: Router
  ) {}

  resolve(route: ActivatedRouteSnapshot): Promise<any> {
    const id = route.paramMap.get('id');
    return Promise.all([
      (this.workflowService as any).downloadWorkflow(id),
      (this.operations as any).load().then(() => (this.operationsHierarchy as any).load())
    ]).then(([workflow]: any[]) => {
      const owned = (this.userService as any).getSeahorseUser().id === workflow.workflowInfo.ownerId;
      if (owned) { this.serverCommunication.init(workflow.id); }
      (this.workflowService as any).initRootWorkflow(workflow);
      this.$rootScope.stateData.dataIsLoaded = true;
      this.$rootScope._workflowWithResults = workflow;
      return workflow;
    }).catch((error: any) => {
      // eslint-disable-next-line no-console
      console.error(`Problem with opening workflow ${id}`, error);
      this.router.navigate(['/']);
      (this.notificationService as any).showError({
        title: 'Problem with opening workflow',
        message: `Problem occured while opening workflow with id ${id}`
      });
      return null;
    });
  }
}

export const workflowResolver: ResolveFn<any> = (route: ActivatedRouteSnapshot) =>
  inject(WorkflowResolver).resolve(route);
