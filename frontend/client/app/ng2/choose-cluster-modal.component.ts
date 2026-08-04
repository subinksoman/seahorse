/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Component, OnInit, DoCheck, Inject } from '@angular/core';
import { DialogRef } from '@angular/cdk/dialog';
import { DeleteModalService } from './delete-modal.service';
import { ClusterModalService } from './cluster-modal.service';
import { WorkflowService } from './workflow.service';
import clusterSpark from 'ASSETS/images/cluster-spark.png';
import clusterMesos from 'ASSETS/images/cluster-mesos.png';
import clusterYarn from 'ASSETS/images/cluster-yarn.png';
import clusterLocalSm from 'ASSETS/images/cluster-local-sm.png';
import clusterSparkSm from 'ASSETS/images/cluster-spark-sm.png';
import clusterMesosSm from 'ASSETS/images/cluster-mesos-sm.png';
import clusterYarnSm from 'ASSETS/images/cluster-yarn-sm.png';

const COOKIE_NAME = 'SEAHORSE_DELETE_PRESET_CONFIRMATION';

// Phase C / AngularJS removal: cluster "Presets" chooser on CDK/ModalService (was choose-cluster-modal).
// Opens the (also-migrated) preset modal via ClusterModalService. PresetService bridged; the $scope.$watch
// on the preset list -> ngDoCheck. ng-switch cluster icons -> [ngSwitch]; images imported as assets.
@Component({
  standalone: false,
  template: `
    <div class="modal-content">
      <div class="cluster-modal">
        <div class="modal-header cluster-modal__header">Presets</div>
        <div class="modal-body cluster-modal__body">
          <div class="section-title">Create new preset</div>
          <div class="cluster-selection">
            <div class="cluster-selection-box" (click)="openClusterSettingsModal('standalone')">
              <div class="cluster-selection-box__image"><img [src]="img.spark"/></div>
              <div class="cluster-selection-box__title">Standalone</div>
            </div>
            <div class="cluster-selection-box" (click)="openClusterSettingsModal('mesos')">
              <div class="cluster-selection-box__image"><img [src]="img.mesos"/></div>
              <div class="cluster-selection-box__title">Mesos</div>
            </div>
            <div class="cluster-selection-box" (click)="openClusterSettingsModal('yarn')">
              <div class="cluster-selection-box__image"><img [src]="img.yarn"/></div>
              <div class="cluster-selection-box__title">YARN</div>
            </div>
          </div>
          <div class="cluster-presets">
            <div class="section-title">Presets</div>
            <div class="cluster-presets__list">
              <deepsense-loading-spinner-sm *ngIf="presets === undefined"></deepsense-loading-spinner-sm>
              <div *ngIf="error" class="dataframe-info">{{ error }}</div>
              <div class="cluster-presets__preset" *ngFor="let preset of presets; trackBy: trackById">
                <div class="cluster-presets__preset-group"
                     [ngClass]="{'current-preset': isPresetAssignedToWorkflow(preset.id)}">
                  <div class="cluster-presets__preset-icon" (click)="selectCurrentPreset(preset.id)"
                       [ngSwitch]="preset.clusterType">
                    <img *ngSwitchCase="'local'" [src]="img.localSm"/>
                    <img *ngSwitchCase="'standalone'" [src]="img.sparkSm"/>
                    <img *ngSwitchCase="'mesos'" [src]="img.mesosSm"/>
                    <img *ngSwitchCase="'yarn'" [src]="img.yarnSm"/>
                  </div>
                  <div class="cluster-presets__preset-type" (click)="selectCurrentPreset(preset.id)">
                    {{ formatPresetType(preset.clusterType) }}
                  </div>
                  <div class="cluster-presets__preset-name" (click)="selectCurrentPreset(preset.id)">
                    {{ preset.name }}
                  </div>
                  <div (click)="openClusterSettingsModal(preset.clusterType, preset)"
                       class="cluster-presets__preset-edit" *ngIf="preset.isEditable">edit</div>
                </div>
                <div class="cluster-presets__preset-delete" (click)="deletePresetById(preset)"
                     *ngIf="preset.isEditable && !preset.isDefault">
                  <i class="fa fa-trash-o"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer cluster-modal__footer">
          <button type="button" class="btn btn-white" (click)="close()">Close</button>
        </div>
      </div>
    </div>
  `
})
export class ChooseClusterModalComponent implements OnInit, DoCheck {
  readonly img = {
    spark: clusterSpark, mesos: clusterMesos, yarn: clusterYarn,
    localSm: clusterLocalSm, sparkSm: clusterSparkSm, mesosSm: clusterMesosSm, yarnSm: clusterYarnSm
  };
  presets: any[] = undefined;
  error = '';
  isSnapshot = false;

  constructor(
    private dialogRef: DialogRef<any>,
    @Inject('PresetService') private presetService: any,
    private deleteModalService: DeleteModalService,
    private clusterModalService: ClusterModalService,
    private workflowService: WorkflowService
  ) {}

  ngOnInit(): void {
    this.presets = this.presetService.getAll();
    this.presetService.fetch().catch((error: any) => {
      this.presets = [];
      this.error = 'There was a problem with downloading presets';
      // eslint-disable-next-line no-console
      console.error('PresetsService fetch failed', error);
    });
  }

  ngDoCheck(): void {
    this.presets = this.presetService.getAll();
  }

  trackById(_i: number, preset: any): any { return preset.id; }

  openClusterSettingsModal(type: string, preset?: any): void {
    (this.clusterModalService as any).openCurrentClusterModal(type, preset, this.isSnapshot);
  }

  deletePresetById(preset: any): void {
    (this.deleteModalService as any).handleDelete(() => this.presetService.deletePreset(preset.id), COOKIE_NAME);
  }

  isPresetAssignedToWorkflow(presetId: any): boolean {
    const currentPreset = (this.workflowService as any).getRootWorkflow().cluster;
    return presetId === currentPreset.id;
  }

  selectCurrentPreset(presetId: any): void {
    if (!(this.workflowService as any).isExecutorForCurrentWorkflowRunning()) {
      (this.workflowService as any).bindPresetToCurrentWorkflow(presetId);
    }
  }

  formatPresetType(type: string): string {
    return (this.clusterModalService as any).formatPresetType(type);
  }

  close(): void { this.dialogRef.close(); }
}
