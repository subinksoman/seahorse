/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Injectable } from '@angular/core';
import { Dialog } from '@angular/cdk/dialog';
import { firstValueFrom } from 'rxjs';

export interface ModalRef<T = any> {
  // Resolves with the value passed to close() — undefined if dismissed via ESC/backdrop.
  result: Promise<T | undefined>;
  close: (value?: any) => void;
}

// Phase C / AngularJS removal: the Angular replacement for angular-ui-bootstrap's $uibModal, built on
// @angular/cdk/dialog (no jQuery, no ui.bootstrap). Opens an Angular component as a modal; the content
// components reuse the existing Bootstrap `.modal-content` markup for styling. As each uib-modal is
// converted onto this service, ui.bootstrap gets closer to removal (which clears the angular high).
@Injectable({ providedIn: 'root' })
export class ModalService {
  constructor(private dialog: Dialog) {}

  open<T = any>(component: any, data?: any, config: any = {}): ModalRef<T> {
    const ref = this.dialog.open<T>(component, {
      data,
      hasBackdrop: true,
      // default: clicking the backdrop / ESC does NOT close (matches uib backdrop:'static'); callers
      // that want dismissable modals pass { disableClose: false }.
      disableClose: config.disableClose !== undefined ? config.disableClose : true,
      panelClass: config.panelClass || 'ds-modal-panel',
      ...config
    });
    return {
      result: firstValueFrom(ref.closed),
      close: (value?: any) => ref.close(value)
    };
  }
}
