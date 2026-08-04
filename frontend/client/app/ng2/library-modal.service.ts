/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Injectable, Inject } from '@angular/core';
import tpl from '../workflows/library/library-modal.html';

// Phase C-1: migrated from workflows/library/library-modal.service.js. Opens the library modal via
// angular-ui-bootstrap ($uibModal, bridged); template + LibraryModalCtrl stay AngularJS. Also holds
// the uploading-files popover + new-directory-input UI flags (legacy closure vars -> instance fields;
// root singleton, identical semantics). Public surface unchanged; downgraded as 'LibraryModalService'.
@Injectable({ providedIn: 'root' })
export class LibraryModalService {
  private isUploadingFilesPopoverOpen = false;
  private isNewDirectoryInputVisible = false;

  constructor(@Inject('$uibModal') private $uibModal: any) {
    // getUploadingFilesPopoverStatus is passed detached to $scope.$watch (recent-files-indicator);
    // the legacy service used closures (no `this`), so bind the state getters to keep instance context.
    this.getUploadingFilesPopoverStatus = this.getUploadingFilesPopoverStatus.bind(this);
    this.getNewDirectoryInputVisibility = this.getNewDirectoryInputVisibility.bind(this);
  }

  openLibraryModal(mode: any, params: any): any {
    return this.$uibModal.open({
      animation: false,
      templateUrl: tpl,
      size: 'lg',
      controller: 'LibraryModalCtrl',
      controllerAs: 'controller',
      backdrop: 'static',
      keyboard: true,
      resolve: {
        mode: () => mode,
        params: () => params
      }
    }).result.then((result: any) => {
      this.closeUploadingFilesPopover();
      return result;
    })
      .catch(() => {
        this.closeUploadingFilesPopover();
        this.hideNewDirectoryInput();
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
