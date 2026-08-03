/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Injectable, Inject } from '@angular/core';
import clusterModalTpl from '../workflows/cluster-settings-modals/choose-cluster-modal.html';
import presetModalTpl from '../workflows/cluster-settings-modals/preset-modal/preset-modal.html';

const presetTypesMap: { [k: string]: string } = {
  standalone: 'Stand-alone',
  yarn: 'YARN',
  mesos: 'Mesos',
  local: 'Local'
};

// Phase C-1: migrated from workflows/cluster-settings-modals/cluster-modal.srv.js. Opens the
// cluster-selection / preset modals via angular-ui-bootstrap ($uibModal, bridged); templates +
// ChooseClusterModalCtrl/PresetModalCtrl stay AngularJS. Public surface unchanged; downgraded as
// 'ClusterModalService'.
@Injectable({ providedIn: 'root' })
export class ClusterModalService {
  constructor(@Inject('$uibModal') private $uibModal: any) {}

  formatPresetType(type: string): string {
    return presetTypesMap[type];
  }

  openClusterSelectionModal(): any {
    return this.$uibModal.open({
      animation: false,
      templateUrl: clusterModalTpl,
      controller: 'ChooseClusterModalCtrl',
      controllerAs: 'controller',
      backdrop: 'static',
      size: 'lg',
      keyboard: true
    });
  }

  openCurrentClusterModal(type: string, preset: any, isSnapshot: boolean): any {
    return this.$uibModal.open({
      animation: false,
      templateUrl: presetModalTpl,
      controller: 'PresetModalCtrl',
      controllerAs: 'controller',
      backdrop: 'static',
      size: 'lg',
      keyboard: true,
      resolve: {
        preset: () => preset,
        type: () => type,
        isSnapshot: () => isSnapshot
      }
    });
  }
}
