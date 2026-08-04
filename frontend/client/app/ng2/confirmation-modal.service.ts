/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Injectable } from '@angular/core';
import { ModalService } from './modal.service';
import { ConfirmationModalComponent } from './confirmation-modal.component';

// Phase C / AngularJS removal: now opens the CDK-based ConfirmationModalComponent via ModalService
// (was uib-modal via bridged $uibModal). Public surface changed slightly: showModal now RESOLVES a
// boolean (true = confirmed, false = dismissed) instead of resolve-on-OK / reject-on-dismiss — callers
// updated accordingly. Downgraded as 'ConfirmationModalService' for any remaining AngularJS callers.
@Injectable({ providedIn: 'root' })
export class ConfirmationModalService {
  constructor(private modal: ModalService) {}

  showModal(options: { message: string } = { message: '' }): Promise<boolean> {
    return this.modal
      .open<boolean>(ConfirmationModalComponent, { message: options.message }, { disableClose: false })
      .result.then((v) => !!v);
  }
}
