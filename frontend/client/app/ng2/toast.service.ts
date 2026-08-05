/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Injectable } from '@angular/core';

export type ToastType = 'success' | 'info' | 'warning' | 'error';
export interface ToastHandle { el: HTMLElement; dismiss: () => void; }

// Phase C / AngularJS removal: native replacement for angular-toastr (the bridged 'toastr'), used by
// NotificationService. Plain-DOM toasts in a fixed bottom-left container (matching the old toastr config:
// bottom-left, close button, progress bar, 3.5s default timeout, HTML allowed). No third-party dep; the
// look is styled by toast.css (imported in bootstrap.ts). show() returns a handle; clear() dismisses it.
@Injectable({ providedIn: 'root' })
export class ToastService {
  private static readonly DEFAULT_TIMEOUT = 3500;
  private container: HTMLElement | null = null;

  private ensureContainer(): HTMLElement {
    if (!this.container || !this.container.isConnected) {
      this.container = document.createElement('div');
      this.container.className = 'ds-toast-container';
      document.body.appendChild(this.container);
    }
    return this.container;
  }

  show(type: ToastType, message: string, title?: string, settings?: any): ToastHandle {
    const timeOut = settings && settings.timeOut !== undefined ? settings.timeOut : ToastService.DEFAULT_TIMEOUT;

    const el = document.createElement('div');
    el.className = `ds-toast ds-toast--${type}`;

    const close = document.createElement('button');
    close.className = 'ds-toast__close';
    close.type = 'button';
    close.setAttribute('aria-label', 'Close');
    close.textContent = '×';
    el.appendChild(close);

    if (title) {
      const t = document.createElement('div');
      t.className = 'ds-toast__title';
      t.innerHTML = title; // toastr ran with allowHtml: true
      el.appendChild(t);
    }
    const m = document.createElement('div');
    m.className = 'ds-toast__msg';
    m.innerHTML = message;
    el.appendChild(m);

    let timer: any;
    const remove = (): void => {
      clearTimeout(timer);
      if (el.parentNode) {
        el.classList.add('ds-toast--out');
        setTimeout(() => { if (el.parentNode) { el.remove(); } }, 300);
      }
    };
    close.addEventListener('click', remove);

    if (timeOut > 0) {
      const bar = document.createElement('div');
      bar.className = 'ds-toast__bar';
      bar.style.animationDuration = `${timeOut}ms`;
      el.appendChild(bar);
      timer = setTimeout(remove, timeOut);
    }

    this.ensureContainer().appendChild(el);
    return { el, dismiss: remove };
  }

  clear(handle: ToastHandle | undefined | null): void {
    if (handle && handle.dismiss) { handle.dismiss(); }
  }
}
