/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Injectable, NgZone } from '@angular/core';
import * as _ from 'lodash';

// Phase C / bootstrap inversion (THE FLIP): a native, framework-agnostic replacement for the AngularJS
// $rootScope. Once AngularJS is gone there is no $digest loop and no $rootScope, but ~30 migrated ng2
// services/components still talk through the (now purely ng2-internal) $rootScope contract: the event
// bus ($on/$broadcast/$emit), the observation API ($watch/$watchGroup/$watchCollection), a couple of
// change-detection kicks ($applyAsync/$digest), the $$listeners registry, and the shared editor state
// (stateData / pageTitle / showView / _workflowWithResults). This service implements exactly that
// surface and is provided under the '$rootScope' string token, so NONE of those @Inject('$rootScope')
// consumers change. The AngularJS $digest cadence is replaced by a zone-driven tick (see constructor).
const INIT = Symbol('uninitialized-watch-value');

interface Watcher { get: () => any; last: any; cb: (n: any, o: any) => void; mode: 'ref' | 'deep' | 'collection' | 'group'; }

@Injectable({ providedIn: 'root' })
export class RootScopeService {
  // ---- shared editor state (was set directly on $rootScope) ----
  // Seeded exactly as the old app.run.js did.
  stateData: any = { showView: undefined, dataIsLoaded: undefined };
  pageTitle = '';
  showView: any = undefined;
  _workflowWithResults: any = undefined;
  // Legacy code occasionally stashed ad-hoc props on $rootScope; keep it permissive.
  [key: string]: any;

  // ---- event bus. Kept under $$listeners because router-shell iterates/clears it on navigation. ----
  $$listeners: { [event: string]: Array<((...a: any[]) => void) | null> } = {};

  private watchers: Watcher[] = [];
  private applyQueue: Array<() => void> = [];
  private digesting = false;

  constructor(private zone: NgZone) {
    // Replaces the AngularJS digest cadence: run the watchers on a fixed tick inside the Angular zone
    // (so bindings that read watched values are re-checked). 60ms ~ AngularJS's interaction-driven
    // digest frequency; comparisons are cheap dirty-checks. Runs outside the zone to schedule, inside
    // to execute (a bare in-zone setInterval would itself keep CD churning even with no work to do).
    this.zone.runOutsideAngular(() => {
      setInterval(() => this.zone.run(() => this.$digest()), 60);
    });
  }

  // ---------------- event bus ----------------
  $on(name: string, cb: (...args: any[]) => void): () => void {
    const arr = this.$$listeners[name] || (this.$$listeners[name] = []);
    arr.push(cb);
    return () => {
      const cur = this.$$listeners[name];
      if (!cur) { return; }
      const i = cur.indexOf(cb);
      if (i >= 0) { cur[i] = null; } // null-then-skip (matches AngularJS; avoids reindexing mid-emit)
    };
  }

  $broadcast(name: string, ...args: any[]): any { return this.fire(name, args); }
  $emit(name: string, ...args: any[]): any { return this.fire(name, args); }

  private fire(name: string, args: any[]): any {
    const evt: any = {
      name, defaultPrevented: false,
      preventDefault() { this.defaultPrevented = true; },
      stopPropagation() {}, stopImmediatePropagation() {}
    };
    const arr = this.$$listeners[name];
    if (arr) {
      for (const cb of arr.slice()) {
        if (cb) {
          try { cb(evt, ...args); } catch (e) { /* eslint-disable-next-line no-console */ console.error(e); }
        }
      }
    }
    return evt;
  }

  // ---------------- observation ----------------
  $watch(exp: string | (() => any), cb?: (n: any, o: any) => void, deep = false): () => void {
    return this.register(this.toGetter(exp), cb, deep ? 'deep' : 'ref');
  }

  $watchCollection(exp: string | (() => any), cb?: (n: any, o: any) => void): () => void {
    return this.register(this.toGetter(exp), cb, 'collection');
  }

  $watchGroup(exps: Array<string | (() => any)>, cb?: (n: any, o: any) => void): () => void {
    const gets = exps.map((e) => this.toGetter(e));
    return this.register(() => gets.map((g) => g()), cb, 'group');
  }

  private toGetter(exp: string | (() => any)): () => any {
    return typeof exp === 'function' ? exp : () => this[exp];
  }

  private register(get: () => any, cb: ((n: any, o: any) => void) | undefined, mode: Watcher['mode']): () => void {
    const w: Watcher = { get, last: INIT, cb: cb || (() => {}), mode };
    this.watchers.push(w);
    return () => { const i = this.watchers.indexOf(w); if (i >= 0) { this.watchers.splice(i, 1); } };
  }

  private changed(mode: Watcher['mode'], a: any, b: any): boolean {
    if (a === INIT) { return true; }
    switch (mode) {
      case 'deep': return !_.isEqual(a, b);
      case 'collection':
      case 'group': return !this.shallowEqual(a, b);
      default: return a !== b && !(a !== a && b !== b); // ref eq, NaN-safe
    }
  }

  private shallowEqual(a: any, b: any): boolean {
    if (a === b) { return true; }
    if (!a || !b || typeof a !== 'object' || typeof b !== 'object') { return false; }
    const ka = Object.keys(a); const kb = Object.keys(b);
    if (ka.length !== kb.length) { return false; }
    return ka.every((k) => a[k] === b[k]);
  }

  private snapshot(mode: Watcher['mode'], v: any): any {
    if (mode === 'deep') { return _.cloneDeep(v); }
    if (mode === 'collection' || mode === 'group') { return Array.isArray(v) ? v.slice() : (v && typeof v === 'object' ? { ...v } : v); }
    return v;
  }

  // ---------------- change detection kicks ----------------
  $apply(fn?: () => void): void { if (fn) { fn(); } this.$digest(); }

  $applyAsync(fn?: () => void): void {
    if (fn) { this.applyQueue.push(fn); }
    // Flush on a microtask inside the zone (prompt, and coalesces bursts). The 60ms tick is only a floor.
    Promise.resolve().then(() => this.zone.run(() => this.$digest()));
  }

  $digest(): void {
    if (this.digesting) { return; } // AngularJS forbids nested digests; drain instead.
    this.digesting = true;
    try {
      if (this.applyQueue.length) {
        const q = this.applyQueue; this.applyQueue = [];
        for (const fn of q) { try { fn(); } catch (e) { /* eslint-disable-next-line no-console */ console.error(e); } }
      }
      // Dirty-check loop: re-run until stable (bounded), so cascading watches settle in one digest.
      let dirty = true; let iterations = 0;
      while (dirty && iterations < 10) {
        dirty = false; iterations++;
        for (const w of this.watchers.slice()) {
          let value;
          try { value = w.get(); } catch (e) { continue; }
          if (this.changed(w.mode, w.last, value)) {
            const old = w.last === INIT ? value : w.last;
            w.last = this.snapshot(w.mode, value);
            dirty = true;
            try { w.cb(value, old); } catch (e) { /* eslint-disable-next-line no-console */ console.error(e); }
          }
        }
      }
    } finally {
      this.digesting = false;
    }
  }
}
