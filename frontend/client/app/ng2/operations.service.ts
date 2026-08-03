/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Injectable, Inject } from '@angular/core';
import * as _ from 'lodash';
import { OperationsApiClient } from './operations-api-client.service';
import { OperationsHierarchyService } from './operations-hierarchy.service';

const SINK_OPERATION_ID = 'e652238f-7415-4da6-95c6-ee33808561b2';
const SOURCE_OPERATION_ID = 'f94b04d7-ec34-42f7-8100-93fe235c89f8';
const HIDDEN_OPERATION_IDS_ARRAY = [SINK_OPERATION_ID, SOURCE_OPERATION_ID];

// Phase C-1: migrated from common/api-clients/operations.factory.js (registered as 'Operations').
// Loads + caches the operation definitions and the operation catalogue/category tree from the (now
// Angular) OperationsApiClient, and answers type-compatibility filters via OperationsHierarchyService
// (also Angular, injected directly). $q/$log are bridged. Legacy closure state (isLoaded/operationsData/
// catalogData/categoryMap) becomes instance fields (root singleton, identical semantics). Public
// surface unchanged; downgraded as 'Operations'. A WorkflowService dependency (bottom-up).
@Injectable({ providedIn: 'root' })
export class OperationsService {
  private isLoaded = false;
  private operationsData: any = {};
  private catalogData: any = {};
  private categoryMap: any = {};

  constructor(
    private operationsApiClient: OperationsApiClient,
    private operationsHierarchyService: OperationsHierarchyService,
    @Inject('$q') private $q: any,
    @Inject('$log') private $log: any
  ) {}

  private createCategoryMap(catalog: any[], parentId?: string): void {
    for (let i = catalog.length - 1; i >= 0; i--) {
      const category = catalog[i];
      this.categoryMap[category.id] = category;
      if (parentId) {
        category.parentId = parentId;
      }
      if (category.catalog) {
        this.createCategoryMap(category.catalog, category.id);
      }
    }
  }

  private loadData(): any {
    return this.operationsApiClient.getAll()
      .then((data: any) => {
        const sinkOperation = data.operations[SINK_OPERATION_ID];
        if (sinkOperation) {
          this.removeOutputPortsForSinkOperation(sinkOperation);
        }
        this.operationsData = data.operations;
        Object.freeze(this.operationsData);
        return this.operationsData;
      });
  }

  private loadOperationData(id: string): any {
    return this.operationsApiClient.get(id)
      .then((data: any) => {
        if (_.isUndefined(this.operationsData[id].parameters)) {
          this.removeOutputPortsForSinkOperation(data.operation);
          this.operationsData[id].parameters = Object.freeze(data.operation.parameters || {});
          Object.freeze(this.operationsData[id]);
        }
        return this.operationsData[id];
      }, (error: any) => {
        this.$log.error('error', error);
      });
  }

  private loadCatalog(): any {
    return this.operationsApiClient.getCatalog()
      .then((data: any) => {
        this.filterOutCatalog(data);
        this.catalogData = data.catalog;
        this.categoryMap = {};
        this.createCategoryMap(this.catalogData);
        Object.freeze(this.catalogData);
        Object.freeze(this.categoryMap);
        return this.catalogData;
      });
  }

  // FIXME Backend reuses catalog do look-up in operation/{id} methods.
  // Source and Sink operations should be accessible through id, but should
  // not be part of catalog. As a workaround it's getting filtered out here.
  private filterOutCatalog(catalog: any): void {
    // Catalog have tree structure, where every node have array of catalogs (named 'catalog') and items.
    _.forEach(catalog.catalog, (c: any) => this.filterOutCatalog(c));

    const filteredItems = _.filter(catalog.items, (item: any) => HIDDEN_OPERATION_IDS_ARRAY.indexOf(item.id) === -1);
    catalog.items = filteredItems;
  }

  // Due to backend design flaw operation API says that SINK operation has one output port.
  // Eventually we probably will fix that. For now we are hacking it around in frontend
  // by manually removing output ports for sink operation.
  // TODO Remove it once API is fixed
  private removeOutputPortsForSinkOperation(operation: any): void {
    if (operation.id === SINK_OPERATION_ID) {
      operation.ports.output = [];
    }
  }

  load(): any {
    if (this.isLoaded) {
      const deferred = this.$q.defer();
      deferred.resolve();
      return deferred.promise;
    }

    // Wrap loadCatalog so it keeps `this` when passed to .then (it is a class method, not a closure).
    return this.loadData()
      .then(() => this.loadCatalog())
      .then(() => {
        this.isLoaded = true;
      });
  }

  getData(id?: string): any {
    if (!this.isLoaded) {
      this.$log.error('Operations not loaded!');
      return null;
    }
    return this.operationsData;
  }

  get(id: string): any {
    if (!this.isLoaded) {
      this.$log.error('Operations not loaded!');
      return null;
    }
    return this.operationsData[id] || null;
  }

  getWithParams(id: string): any {
    if (!this.isLoaded) {
      this.$log.error('Operations not loaded!');
    }
    const operation = this.operationsData[id] || null;
    if (!this.isLoaded || (operation && operation.parameters)) {
      const deferred = this.$q.defer();
      deferred.resolve(operation);
      return deferred.promise;
    }
    return this.loadOperationData(id);
  }

  hasWithParams(id: string): boolean {
    const operation = this.operationsData[id] || null;
    return !!(this.isLoaded && operation && operation.parameters);
  }

  getCatalog(id?: string): any {
    if (!this.isLoaded) {
      this.$log.error('Operations not loaded!');
      return null;
    }
    return this.catalogData;
  }

  getCategory(id: string): any {
    if (!this.isLoaded) {
      this.$log.error('Operations not loaded!');
      return null;
    }
    return this.categoryMap[id] || null;
  }

  filterCatalog(catalog: any[], filter: (item: any) => boolean): any {
    if (!this.isLoaded) {
      this.$log.error('Operations not loaded!');
      return null;
    }
    return catalog.map((catalog: any) => {
      return Object.assign({}, catalog, {
        catalog: this.filterCatalog(catalog.catalog, filter),
        items: catalog.items.filter(filter)
      });
    }).filter((catalog: any) => catalog.items.length || catalog.catalog.length);
  }

  getFilterForTypeQualifier(inputQualifier: string): (item: any) => number {
    return (item: any) => {
      return this.get(item.id).ports.input.filter((port: any) =>
        this.operationsHierarchyService.IsDescendantOf(inputQualifier, port.typeQualifier)
      ).length;
    };
  }
}
