/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import * as _ from 'lodash';

// Phase C / bootstrap inversion (THE FLIP): once the `angular` global is gone, the handful of ng2 call
// sites that used angular.copy / .merge / .extend / .identity need native equivalents. These mirror the
// AngularJS semantics precisely:
//   - copy: a DEEP clone that keeps FUNCTION properties by reference (angular.copy does the same — vital
//     for the status-bar menu-item objects whose `callFunction` must survive the clone; a plain
//     _.cloneDeep would replace functions with {}).
//   - merge: deep recursive merge (lodash _.merge matches angular.merge).
//   - extend: shallow own-enumerable copy (lodash _.assign matches angular.extend).
//   - identity: returns its argument (used as ngFileUpload transformRequest passthrough).
export function copy<T>(value: T): T {
  return _.cloneDeepWith(value, (v: any) => (typeof v === 'function' ? v : undefined)) as T;
}

export function merge(dst: any, ...srcs: any[]): any {
  return (_.merge as any)(dst, ...srcs);
}

export function extend(dst: any, ...srcs: any[]): any {
  return (_.assign as any)(dst, ...srcs);
}

export function identity<T>(value: T): T {
  return value;
}
