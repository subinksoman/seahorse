/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Injectable } from '@angular/core';
import { DeleteModalService } from './delete-modal.service';
import { EventsService } from './events.service';
import { WorkflowService } from './workflow.service';

const COOKIE_NAME = 'SEAHORSE_NODE_DELETE_NO_CONFIRMATION';

// Phase C-1: migrated from workflows/workflows-editor/workflows-editor.service.js. Fully clean — all
// three deps are already-migrated Angular services injected directly. Guards node deletion behind the
// delete-confirmation modal + publishes the delete event. `deleteSelection` is passed to
// DeleteModalService.handleDelete via an arrow wrapper so it keeps its instance context. Public surface
// unchanged; downgraded as 'WorkflowsEditorService'.
@Injectable({ providedIn: 'root' })
export class WorkflowsEditorService {
  constructor(
    private deleteModalService: DeleteModalService,
    private eventsService: EventsService,
    private workflowService: WorkflowService
  ) {}

  handleDelete(): void {
    if (this.workflowService.isWorkflowEditable()) {
      this.deleteModalService.handleDelete(() => this.deleteSelection(), COOKIE_NAME);
    }
  }

  private deleteSelection(): void {
    this.eventsService.publish(this.eventsService.EVENTS.WORKFLOW_DELETE_SELECTED_ELEMENT);
  }
}
