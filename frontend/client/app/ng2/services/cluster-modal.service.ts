/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Injectable } from '@angular/core';
import { ModalService } from '../modals/modal.service';
import { ChooseClusterModalComponent } from '../modals/choose-cluster-modal.component';
import { PresetModalComponent } from '../modals/preset-modal.component';

const presetTypesMap: { [k: string]: string } = {
  standalone: 'Stand-alone',
  yarn: 'YARN',
  mesos: 'Mesos',
  local: 'Local'
};

// Phase C / AngularJS removal: opens the cluster-selection / preset modals on CDK/ModalService (was
// uib-modal). The choose-cluster modal opens the preset modal, so both are CDK — CDK stacks its
// overlays cleanly. Public surface unchanged; downgraded as 'ClusterModalService'.
@Injectable({ providedIn: 'root' })
export class ClusterModalService {
  constructor(private modal: ModalService) {}

  formatPresetType(type: string): string {
    return presetTypesMap[type];
  }

  openClusterSelectionModal(): any {
    return this.modal.open(ChooseClusterModalComponent, {}, { panelClass: ['ds-modal-panel', 'ds-modal-lg'] });
  }

  openCurrentClusterModal(type: string, preset: any, isSnapshot: boolean): any {
    return this.modal.open(PresetModalComponent, { preset, type, isSnapshot },
      { panelClass: ['ds-modal-panel', 'ds-modal-lg'] });
  }
}
