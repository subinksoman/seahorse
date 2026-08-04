/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Component, DoCheck } from '@angular/core';
import { MultiSelectionService } from './multi-selection.service';
import { WorkflowService } from './workflow.service';
import { UserService } from './user.service';
import { WorkflowsEditorService } from './workflows-editor.service';

// Phase C / workflows-status-bar: migrated from workflows-status-bar/selection-items. The "SELECTION: Delete"
// status-bar item shown when nodes are multi-selected. Downgraded 'selectionItems'; its <selection-items>
// usage has no bindings. All deps are Angular services. The two $rootScope.$watch (selection from the
// service; clear on workflow switch) become ngDoCheck.
@Component({
  standalone: false,
  selector: 'selection-items',
  template: `
    <div class="selection-items fadeInUp animated" *ngIf="hasElements()">
      <div class="selection-title">SELECTION:</div>
      <div class="button-wrapper">
        <a class="status-bar-item" [ngClass]="{ 'menu-item-disabled': !canDelete() }" (click)="delete()">
          <div class="c-workflows-status-bar__text">
            <span class="c-workflows-status-bar__text-label">Delete</span>
            <span class="c-workflows-status-bar__text-small-label" *ngIf="!isOwner()">Owner only</span>
          </div>
        </a>
      </div>
    </div>
  `
})
export class SelectionItemsComponent implements DoCheck {
  selection: any[] = [];
  currentWorkflow: any;

  constructor(
    private multiSelectionService: MultiSelectionService,
    private workflowService: WorkflowService,
    private userService: UserService,
    private workflowsEditorService: WorkflowsEditorService
  ) {
    this.currentWorkflow = (this.workflowService as any).getCurrentWorkflow();
  }

  ngDoCheck(): void {
    const cw = (this.workflowService as any).getCurrentWorkflow();
    if (cw !== this.currentWorkflow) {
      // Workflow switched: clear the local selection (the service isn't workflow-aware).
      this.currentWorkflow = cw;
      this.selection = [];
    } else {
      this.selection = (this.multiSelectionService as any).getSelectedNodeIds();
    }
  }

  hasElements(): boolean {
    return this.selection.length > 0;
  }

  isOwner(): boolean {
    return this.currentWorkflow && this.currentWorkflow.owner.id === (this.userService as any).getSeahorseUser().id;
  }

  canDelete(): boolean {
    return this.isOwner() &&
      this.currentWorkflow.workflowStatus === 'editor' &&
      this.currentWorkflow.sessionStatus === 'running';
  }

  delete(): void {
    (this.workflowsEditorService as any).handleDelete();
  }
}
