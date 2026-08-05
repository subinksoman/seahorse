/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Injectable } from '@angular/core';
import { ModalService } from '../modals/modal.service';
import { ExportModalComponent } from '../modals/export-modal.component';

// Phase C / AngularJS removal: opens the CDK ExportModalComponent (was uib-modal). The component owns
// the download logic; the service just opens it. Public surface (showModal) unchanged; downgraded as
// 'ExportModalService'.
@Injectable({ providedIn: 'root' })
export class ExportModalService {
  constructor(private modal: ModalService) {}

  showModal(): void {
    // panelClass MUST be an array for multiple classes — CDK calls classList.add(panelClass), which
    // throws on a space-containing string.
    this.modal.open(ExportModalComponent, {}, { panelClass: ['ds-modal-panel', 'seahorse-modal-wrapper'] });
  }
}
