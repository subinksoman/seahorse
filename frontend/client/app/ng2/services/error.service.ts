/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Injectable } from '@angular/core';

// Phase C-1: migrated from errors/errors.service.js (pure leaf — no deps). Maps HTTP status codes
// to ui-router error states. Public surface (getErrorState) unchanged; downgraded as 'ErrorService'.
@Injectable({ providedIn: 'root' })
export class ErrorService {
  private readonly errorsTable: { [code: number]: string } = {
    409: 'ConflictState',
    408: 'RequestTimeout',
    404: 'MissingState',
    [-1]: 'MissingState'
  };

  getErrorState(errorId: number): string {
    return this.errorsTable[errorId];
  }
}
