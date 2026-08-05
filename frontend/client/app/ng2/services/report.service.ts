/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Injectable, Inject } from '@angular/core';
import { defer } from '../core/defer';
import { BottomBarService } from './bottom-bar.service';

// Phase C-1: migrated from workflows/reports/reports.factory.js (registered as 'Report'). Caches
// result-entity reports and resolves them as $q promises (bridged), toggling $rootScope.stateData
// flags. Injects the already-migrated Angular BottomBarService DIRECTLY as a class (bottom-up win).
// The legacy module-scoped reportsStorage Map becomes an instance field (root singleton, identical
// semantics). Public surface unchanged; downgraded as 'Report'.
@Injectable({ providedIn: 'root' })
export class ReportService {
  private reportsStorage = new Map<string, any>();

  constructor(
    @Inject('$rootScope') private $rootScope: any,
    private bottomBarService: BottomBarService
  ) {}

  createReportEntities(reportId: string, resultEntities: { [id: string]: any }): void {
    for (const reportEntityId in resultEntities) {
      const resultEntity = resultEntities[reportEntityId];
      if (resultEntity.report) {
        resultEntity.report.reportId = reportId;
        this.reportsStorage.set(reportEntityId, resultEntity);
      }
    }
  }

  getReportEntity(reportEntityId: string): any {
    return this.reportsStorage.get(reportEntityId);
  }

  hasReportEntity(reportEntityId: string): boolean {
    return !!this.getReportEntity(reportEntityId);
  }

  getReport(reportEntityId: string): any {
    const deferred = defer();

    try {
      const reportEntity = this.getReportEntity(reportEntityId);
      this.$rootScope.stateData.dataIsLoaded = true;
      deferred.resolve(reportEntity.report);
    } catch (e) {
      this.$rootScope.stateData.errorMessage = 'Could not load the report';
      deferred.reject();
    }
    return deferred.promise;
  }

  openReport(): void {
    this.bottomBarService.activatePanel('reportTab');
  }
}
