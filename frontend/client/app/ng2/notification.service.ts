/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Injectable, Inject } from '@angular/core';
import * as _ from 'lodash';
import { ToastService, ToastHandle } from './toast.service';

// Phase C-1: migrated from common/services/notification.service.js. Wraps the native ToastService (was
// angular-toastr's bridged 'toastr') with de-duplication of same-named toasts. $log is bridged from
// AngularJS. Public surface unchanged; downgraded as 'NotificationService'.
@Injectable({ providedIn: 'root' })
export class NotificationService {
  /* Array of all messages in order to delete them after some time */
  private messages: Array<{ name: string; toast: ToastHandle }> = [];

  constructor(
    @Inject('$log') private $log: any,
    private toast: ToastService
  ) {}

  showWithParams(params: any): void {
    const toast = this.toast.show(params.notificationType, params.message, params.title, params.settings);
    this.handleSameMessages(params.message, toast);
    this.replaceInfoMessagesWithSuccess(params.message, toast);
  }

  showError(data: any, error?: any): void {
    this.$log.error(data.title, error);
    const toast = this.toast.show('error', data.message, data.title, { timeOut: 10000 });
    this.handleSameMessages(data.message, toast);
    this.replaceInfoMessagesWithSuccess(data.message, toast);
  }

  handleSameMessages(name: string, toast: ToastHandle): void {
    _.remove(this.messages, (message: any) => {
      const result = message.name === name;
      if (result) {
        this.toast.clear(message.toast);
      }
      return result;
    });
    this.messages.push({ name, toast });
  }

  clearToasts(): void {
    this.messages.forEach((message) => {
      this.toast.clear(message.toast);
    });
  }

  replaceInfoMessagesWithSuccess(name: string, toast: any): void {
    const regExp = /\.SUCCESS$/;
    const match = name.match(regExp);
    if (match) {
      this.handleSameMessages(name.replace(regExp, ''), toast);
    }
  }
}
