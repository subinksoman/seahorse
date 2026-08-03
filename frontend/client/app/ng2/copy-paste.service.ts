/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Injectable, Inject } from '@angular/core';
import { NodeCopyPasteVisitorService } from './node-copy-paste-visitor.service';
import { WorkflowService } from './workflow.service';
import { UserService } from './user.service';

const OBJECT_TYPE = 'application/seahorseObjects/';

// Phase C-1: migrated from workflows/copy-paste/copy-paste.js. Wires the browser copy/paste clipboard
// events (via the bridged $document) to the node copy/paste visitor. Injects the Angular
// NodeCopyPasteVisitorService/WorkflowService/UserService directly. Listeners are registered on
// construction (lazy first injection), matching the legacy service. Public surface (setEnabled)
// unchanged; downgraded as 'CopyPasteService'.
@Injectable({ providedIn: 'root' })
export class CopyPasteService {
  private enabled = true;

  constructor(
    @Inject('$document') private $document: any,
    @Inject('$rootScope') private $rootScope: any,
    private nodeCopyPasteVisitorService: NodeCopyPasteVisitorService,
    private workflowService: WorkflowService,
    private userService: UserService
  ) {
    this.init();
  }

  init(): void {
    this.$document.on('copy', this._copy.bind(this));
    this.$document.on('paste', this._paste.bind(this));
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  private _copy(event: any): void {
    if (this.enabled) {
      const dataType = `${OBJECT_TYPE}${this.nodeCopyPasteVisitorService.getType()}`;
      const isPasteTargetFocused = this.nodeCopyPasteVisitorService.isFocused();

      if (isPasteTargetFocused) {
        if (this.nodeCopyPasteVisitorService.isThereAnythingToCopy()) {
          const data = this.nodeCopyPasteVisitorService.getSerializedDataToCopy();
          event.clipboardData.setData(dataType, data);
        } else {
          event.clipboardData.clearData(dataType);
        }
        event.preventDefault(); // Needed, so clipboard data is not overriden by default handlers.
      }
    }
  }

  private _paste(event: any): void {
    const isOwner = this.workflowService.getCurrentWorkflow().owner.id === this.userService.getSeahorseUser().id;
    if (this.enabled && isOwner) {
      const isPasteTargetFocused = this.nodeCopyPasteVisitorService.isFocused();
      const dataType = `${OBJECT_TYPE}${this.nodeCopyPasteVisitorService.getType()}`;
      const serializedData = event.clipboardData.getData(dataType);
      const shouldBePasted = isPasteTargetFocused && serializedData;

      if (shouldBePasted) {
        this.nodeCopyPasteVisitorService.pasteUsingSerializedData(serializedData);
      }
    }
  }
}
