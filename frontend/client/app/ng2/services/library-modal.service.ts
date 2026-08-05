/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Injectable } from '@angular/core';
import { ModalService } from '../modals/modal.service';
import { LibraryModalComponent } from '../modals/library-modal.component';

// Phase C / AngularJS removal: opens the library picker on CDK/ModalService (was uib-modal). Also holds
// the uploading-files popover + new-directory-input UI flags (root singleton). openLibraryModal resolves
// the selected item (undefined if dismissed). Downgraded as 'LibraryModalService'.
@Injectable({ providedIn: 'root' })
export class LibraryModalService {
  private isUploadingFilesPopoverOpen = false;
  private isNewDirectoryInputVisible = false;

  constructor(private modal: ModalService) {
    // getUploadingFilesPopoverStatus is passed detached to $scope.$watch (recent-files-indicator);
    // the legacy service used closures (no `this`), so bind the state getters to keep instance context.
    this.getUploadingFilesPopoverStatus = this.getUploadingFilesPopoverStatus.bind(this);
    this.getNewDirectoryInputVisibility = this.getNewDirectoryInputVisibility.bind(this);
  }

  openLibraryModal(mode: any, params: any): any {
    return this.modal.open(LibraryModalComponent, { mode, params },
      { panelClass: ['ds-modal-panel', 'ds-modal-lg'] })
      .result.then((result: any) => {
        this.closeUploadingFilesPopover();
        this.hideNewDirectoryInput();
        return result;
      });
  }

  openUploadingFilesPopover(): void {
    this.isUploadingFilesPopoverOpen = true;
  }

  closeUploadingFilesPopover(): void {
    this.isUploadingFilesPopoverOpen = false;
  }

  toggleUploadingFilesPopover(): void {
    this.isUploadingFilesPopoverOpen = !this.isUploadingFilesPopoverOpen;
  }

  getUploadingFilesPopoverStatus(): boolean {
    return this.isUploadingFilesPopoverOpen;
  }

  showNewDirectoryInput(): void {
    this.isNewDirectoryInputVisible = true;
  }

  hideNewDirectoryInput(): void {
    this.isNewDirectoryInputVisible = false;
  }

  getNewDirectoryInputVisibility(): boolean {
    return this.isNewDirectoryInputVisible;
  }
}
