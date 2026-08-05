/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

// Native replacement for AngularJS $q.defer() — a deferred wrapping a native Promise (zone-patched, so
// resolving it still drives Angular change detection). Used by the migrated services that were built on
// the $q.defer() pattern, so the $q bridge can be dropped. .notify() is intentionally omitted (unused).
// resolve/reject accept extra ignored args to match $q.defer()'s lenient signature (some call sites pass
// a second label arg that $q ignored, e.g. deferred.resolve(node, 'sync')).
export function defer<T = any>(): { promise: Promise<T>; resolve: (value?: any, ...ignored: any[]) => void; reject: (reason?: any, ...ignored: any[]) => void } {
  let resolve: any = () => {};
  let reject: any = () => {};
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}
