/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Injectable } from '@angular/core';
import { OperationsService } from './operations.service';

// Phase C / operations-catalogue: migrated from workflows/operations-catalogue/operations-catalogue.service.
// Tracks the currently-visible flyout level and eagerly caches the operation catalog. Only consumer is the
// migrated operations-list component (Angular), so it is NOT downgraded — injected directly as a class. Its
// legacy AngularJS `Operations` dependency is the already-migrated Angular OperationsService.
@Injectable({ providedIn: 'root' })
export class OperationsCatalogueService {
  private allOperations: any;
  private visibleLevel = 1;

  constructor(private operations: OperationsService) {
    this.allOperations = this.operations.getCatalog();
  }

  getAllOperations(): any {
    return this.allOperations;
  }

  setVisibleCatalogueLevel(level: number): void {
    this.visibleLevel = level;
  }

  getVisibleCatalogueLevel(): number {
    return this.visibleLevel;
  }
}
