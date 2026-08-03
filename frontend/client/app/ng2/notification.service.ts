/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Injectable, Inject } from '@angular/core';
import * as _ from 'lodash';

// Phase C-1: migrated from common/services/notification.service.js. Wraps angular-toastr (injected
// via the upgraded 'toastr' provider) with de-duplication of same-named toasts. $rootScope/$log are
// bridged from AngularJS too. Public surface unchanged; downgraded as 'NotificationService'.
@Injectable({ providedIn: 'root' })
export class NotificationService {
  /* Array of all messages in order to delete them after some time */
  private messages: Array<{ name: string; toast: any }> = [];

  constructor(
    @Inject('$rootScope') private $rootScope: any,
    @Inject('$log') private $log: any,
    @Inject('toastr') private toastr: any
  ) {}

  showWithParams(params: any): void {
    const toast = this.toastr[params.notificationType](params.message, params.title, params.settings);
    this.handleSameMessages(params.message, toast);
    this.replaceInfoMessagesWithSuccess(params.message, toast);
  }

  showError(data: any, error?: any): void {
    this.$log.error(data.title, error);
    const toast = this.toastr.error(data.message, data.title, { timeOut: 10000 });
    this.handleSameMessages(data.message, toast);
    this.replaceInfoMessagesWithSuccess(data.message, toast);
  }

  handleSameMessages(name: string, toast: any): void {
    _.remove(this.messages, (message: any) => {
      const result = message.name === name;
      if (result) {
        this.toastr.clear(message.toast);
      }
      return result;
    });
    this.messages.push({ name, toast });
  }

  clearToasts(): void {
    this.messages.forEach((message) => {
      this.toastr.clear(message.toast);
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
