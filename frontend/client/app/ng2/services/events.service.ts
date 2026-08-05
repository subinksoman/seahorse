/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Injectable, Inject } from '@angular/core';

// Phase C-1: migrated from common/services/events.service.js. A thin pub/sub over the AngularJS
// $rootScope event bus (injected via the upgraded '$rootScope' provider). Kept on $rootScope so
// it stays interoperable with legacy $on/$emit listeners still living in AngularJS controllers;
// once all consumers are Angular this can move to an RxJS Subject. Downgraded as 'EventsService'.
@Injectable({ providedIn: 'root' })
export class EventsService {
  readonly EVENTS = {
    WORKFLOW_DELETE_SELECTED_ELEMENT: 'Workflow.DELETE_SELECTED_ELEMENT'
  };

  constructor(@Inject('$rootScope') private $rootScope: any) {}

  on(eventName: string, callback: (...args: any[]) => void): () => void {
    return this.$rootScope.$on(eventName, callback);
  }

  off(removeFunction: () => void): any {
    return removeFunction();
  }

  publish(eventName: string, params?: any): any {
    return this.$rootScope.$emit(eventName, params);
  }
}
