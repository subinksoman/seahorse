/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Injectable } from '@angular/core';

export interface HttpResponse { data: any; status: number; }

// Phase C / bootstrap inversion (step 3): native replacement for AngularJS $http, mirroring the subset
// the ng2 api-clients use: the config-object form ($http({method,url,data,timeout}) -> request()) plus
// get/post/put/delete, each resolving to { data, status } (parsed JSON) and REJECTING that same object on
// non-2xx — matching how consumers read response.data / error.data. Simple calls go through fetch (same-
// origin cookies auto-sent — the app has no $http auth interceptors); FormData uploads with a progress
// handler go through XHR (fetch has no upload-progress). Lets the ng2 side drop the $http bridge.
@Injectable({ providedIn: 'root' })
export class HttpService {
  request(cfg: { method: string; url: string; data?: any; timeout?: number }): Promise<HttpResponse> {
    return this.send(cfg.method, cfg.url, cfg.data, cfg);
  }
  get(url: string, cfg?: any): Promise<HttpResponse> { return this.send('GET', url, undefined, cfg); }
  post(url: string, data?: any, cfg?: any): Promise<HttpResponse> { return this.send('POST', url, data, cfg); }
  put(url: string, data?: any, cfg?: any): Promise<HttpResponse> { return this.send('PUT', url, data, cfg); }
  delete(url: string, cfg?: any): Promise<HttpResponse> { return this.send('DELETE', url, undefined, cfg); }

  private send(method: string, url: string, data: any, cfg: any): Promise<HttpResponse> {
    const isFormData = typeof FormData !== 'undefined' && data instanceof FormData;
    const hasProgress = !!(cfg && cfg.uploadEventHandlers && cfg.uploadEventHandlers.progress);
    if (isFormData || hasProgress) {
      return this.xhr(method, url, data, cfg);
    }
    const opts: RequestInit = { method, credentials: 'same-origin', headers: {} };
    // GET/HEAD cannot carry a body (fetch throws). makeRequest defaults data to {}, so also skip an empty
    // object — only send a body for body-methods with actual data (matching $http, which ignored GET data).
    const bodyAllowed = method !== 'GET' && method !== 'HEAD';
    const hasBody = data !== undefined && data !== null && !(typeof data === 'object' && Object.keys(data).length === 0);
    if (bodyAllowed && hasBody) {
      (opts.headers as any)['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(data);
    }
    let timer: any;
    if (cfg && cfg.timeout) {
      const ctrl = new AbortController();
      opts.signal = ctrl.signal;
      timer = setTimeout(() => ctrl.abort(), cfg.timeout);
    }
    return fetch(url, opts).then(async (res) => {
      if (timer) { clearTimeout(timer); }
      const response: HttpResponse = { data: await this.parse(await res.text()), status: res.status };
      return res.ok ? response : Promise.reject(response);
    });
  }

  private xhr(method: string, url: string, data: any, cfg: any): Promise<HttpResponse> {
    return new Promise<HttpResponse>((resolve, reject) => {
      const x = new XMLHttpRequest();
      x.open(method, url);
      const progress = cfg && cfg.uploadEventHandlers && cfg.uploadEventHandlers.progress;
      if (progress && x.upload) { x.upload.addEventListener('progress', progress); }
      x.addEventListener('load', () => {
        const response: HttpResponse = { data: this.parseSync(x.responseText), status: x.status };
        if (x.status >= 200 && x.status < 300) { resolve(response); } else { reject(response); }
      });
      x.addEventListener('error', () => reject({ data: null, status: x.status }));
      // FormData: don't set Content-Type — the browser adds the multipart boundary.
      x.send(data instanceof FormData ? data : (data !== undefined && data !== null ? JSON.stringify(data) : undefined));
    });
  }

  private async parse(text: string): Promise<any> { return this.parseSync(text); }
  private parseSync(text: string): any {
    if (!text) { return null; }
    try { return JSON.parse(text); } catch (e) { return text; }
  }
}
