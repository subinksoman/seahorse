/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Injectable, Inject } from '@angular/core';
import { ModalService } from './modal.service';
import { DeleteModalComponent } from './delete-modal.component';

// Phase C / AngularJS removal: guards a delete with a "don't ask again" cookie ($cookies, still bridged)
// and, when needed, the CDK DeleteModalComponent (was uib-modal). Public surface (handleDelete) unchanged.
@Injectable({ providedIn: 'root' })
export class DeleteModalService {
  constructor(
    private modal: ModalService,
    @Inject('$cookies') private $cookies: any
  ) {}

  handleDelete(deleteHandler: (...args: any[]) => any, cookieName: string): void {
    if (this.$cookies.get(cookieName) === 'true') {
      deleteHandler();
      return;
    }
    this.modal.open<any>(DeleteModalComponent, {}, { disableClose: false }).result.then((res: any) => {
      if (!res) { return; } // dismissed
      if (res.doNotShowAgain) { this.$cookies.put(cookieName, 'true'); }
      deleteHandler();
    });
  }
}
