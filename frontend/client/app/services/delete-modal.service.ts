/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Injectable } from '@angular/core';
import { ModalService } from '../modals/modal.service';
import { DeleteModalComponent } from '../modals/delete-modal.component';

// Phase C / AngularJS removal: guards a delete with a "don't ask again" cookie and, when needed, the CDK
// DeleteModalComponent (was uib-modal). Public surface (handleDelete) unchanged. Reads/writes the cookie
// natively via document.cookie (was ngCookies' $cookies; the +2yr expiry app.config set as the default is
// applied here) so ngCookies can be dropped.
@Injectable({ providedIn: 'root' })
export class DeleteModalService {
  constructor(private modal: ModalService) {}

  handleDelete(deleteHandler: (...args: any[]) => any, cookieName: string): void {
    if (this.getCookie(cookieName) === 'true') {
      deleteHandler();
      return;
    }
    this.modal.open<any>(DeleteModalComponent, {}, { disableClose: false }).result.then((res: any) => {
      if (!res) { return; } // dismissed
      if (res.doNotShowAgain) { this.setCookie(cookieName, 'true'); }
      deleteHandler();
    });
  }

  private getCookie(name: string): string | undefined {
    const match = document.cookie.split('; ').find((row) => row.startsWith(name + '='));
    return match ? decodeURIComponent(match.split('=').slice(1).join('=')) : undefined;
  }

  private setCookie(name: string, value: string): void {
    const expires = new Date();
    expires.setFullYear(expires.getFullYear() + 2);
    document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires.toUTCString()};path=/`;
  }
}
