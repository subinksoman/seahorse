/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Component, DoCheck, OnDestroy, Inject } from '@angular/core';
import { sessionStatus } from '../enums/session-status.js';
import { WorkflowService } from './workflow.service';
import { UserService } from './user.service';
import { SessionManager } from './session-manager.service';
import { LibraryService } from './library.service';
import { ClusterModalService } from './cluster-modal.service';
import { WorkflowStatusBarService } from './workflow-status-bar.service';

import clusterLocalIcon from 'ASSETS/images/cluster-local-sm.png';
import clusterStandaloneIcon from 'ASSETS/images/cluster-spark-sm.png';
import clusterYarnIcon from 'ASSETS/images/cluster-yarn-sm.png';

// Phase C / workflows-status-bar FINALE: migrated from workflows-editor-status-bar.{html,drv} +
// workflows-status-bar.ctrl.js. The editor's top bar (workflow name, viewer-mode flag, current
// cluster preset, the menu-item row, Spark UI, selection-items island, Data sources). Downgraded
// 'workflowEditorStatusBar'; used (no bindings) in the AngularJS workflows.html. All four $scope
// .$watch become ngDoCheck; the heartbeat $rootScope.$on is registered in the ctor and torn down in
// ngOnDestroy. Deps are the migrated Angular services + bridged config/$rootScope/DatasourcesPanel/
// PredefinedUser. Cluster icons are imported (webpack asset) rather than ~ASSETS html-loader rewrite.
@Component({
  standalone: false,
  selector: 'workflow-editor-status-bar',
  template: `
    <div class="c-workflows-status-bar">
      <div class="c-workflows-status-bar__upper-section">
        <div class="c-workflows-status-bar__upper-section-workflow">
          <span class="c-workflows-status-bar__upper-section-workflow__title" [title]="workflow?.name">
            {{ workflow?.name }}
          </span>
          <span class="viewer-mode" *ngIf="isViewerMode()"> (viewer mode)</span>
          <div class="cluster-settings">
            <div class="current-cluster" *ngIf="currentPreset === undefined">
              <deepsense-loading-spinner-sm></deepsense-loading-spinner-sm>
            </div>
            <div *ngIf="currentPreset" (click)="openCurrentPresetModal(currentPreset)" class="current-cluster">
              <div [ngSwitch]="currentPreset.clusterType" class="current-cluster__icon">
                <img *ngSwitchCase="'local'" [src]="clusterLocalIcon"/>
                <img *ngSwitchCase="'standalone'" [src]="clusterStandaloneIcon"/>
                <img *ngSwitchCase="'yarn'" [src]="clusterYarnIcon"/>
              </div>
              <div>{{ formatPresetType(currentPreset.clusterType) }}</div>
              <div class="current-cluster__name">{{ currentPreset.name }}</div>
            </div>
            <div (click)="openClusterSettings()" class="status-bar-item">
              Cluster presets
            </div>
          </div>
        </div>
      </div>
      <div class="c-workflows-status-bar__lower-section">
        <div class="c-workflows-status-bar__container">
          <menu-item *ngFor="let item of getMenuItems(workflow) || []"
                     [label]="item.label"
                     [forOwnerOnly]="item.forOwnerOnly"
                     [icon]="item.icon"
                     [callFunction]="item.callFunction"
                     [href]="item.href"
                     [target]="item.target"
                     [color]="item.color"
                     [additionalClass]="item.additionalClass"
                     [additionalIconClass]="item.additionalIconClass"
                     [additionalHtmlForOwner]="item.additionalHtmlForOwner">
          </menu-item>
          <menu-item
                     [label]="'Spark UI'"
                     [forOwnerOnly]="false"
                     [href]="sparkUiAddress"
                     [additionalClass]="sparkUiAdditionalClasses"
                     [target]="'_blank'">
          </menu-item>
          <div class="separator"></div>
          <selection-items></selection-items>
        </div>
        <div class="c-workflows-status-bar__container">
          <div class="button-wrapper">
            <a class="status-bar-item" (click)="openDatasources()">
              <div class="c-workflows-status-bar__text">
                <div class="c-workflows-status-bar__text-label">Data sources</div>
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>
  `
})
export class WorkflowsEditorStatusBarComponent implements DoCheck, OnDestroy {
  workflow: any;
  workflowId: string;
  rootId: string;
  currentPreset: any;
  sparkUiAddress: string = undefined;
  sparkUiAdditionalClasses: string;
  isUploadInProgress = false;

  readonly clusterLocalIcon = clusterLocalIcon;
  readonly clusterStandaloneIcon = clusterStandaloneIcon;
  readonly clusterYarnIcon = clusterYarnIcon;

  private deregisterHeartbeat: () => void;

  constructor(
    @Inject('$rootScope') private $rootScope: any,
    @Inject('DatasourcesPanelService') private datasourcesPanelService: any,
    private workflowService: WorkflowService,
    private userService: UserService,
    private sessionManager: SessionManager,
    private libraryService: LibraryService,
    private clusterModalService: ClusterModalService,
    private workflowStatusBarService: WorkflowStatusBarService
  ) {
    this.workflow = (this.workflowService as any).getCurrentWorkflow();
    this.workflowId = this.workflow.id;
    this.rootId = this.workflow.id;
    this.currentPreset = this.getCurrentPreset();
    this.sparkUiAdditionalClasses = this.getSparkUiAdditionalClasses();

    this.deregisterHeartbeat = this.$rootScope.$on('ServerCommunication.MESSAGE.heartbeat', (_event: any, data: any) => {
      this.sparkUiAddress = data.sparkUiAddress !== null ? data.sparkUiAddress : undefined;
    });
  }

  ngDoCheck(): void {
    const cw = (this.workflowService as any).getCurrentWorkflow();
    if (cw !== this.workflow) {
      this.workflow = cw;
      this.workflowId = cw.id;
    }
    const preset = this.getCurrentPreset();
    if (preset && preset !== this.currentPreset) {
      this.currentPreset = preset;
    }
    this.isUploadInProgress =
      (this.libraryService as any).getUploadingFiles().filter((v: any) => v.status === 'uploading').length > 0;
    this.sparkUiAdditionalClasses = this.getSparkUiAdditionalClasses();
  }

  ngOnDestroy(): void {
    if (this.deregisterHeartbeat) { this.deregisterHeartbeat(); }
  }

  private getSparkUiAdditionalClasses(): string {
    return this.isSparkUiAvailable() ? '' : 'menu-item-disabled';
  }

  private getCurrentPreset(): any {
    return (this.workflowService as any).isExecutorForCurrentWorkflowRunning()
      ? (this.sessionManager as any).clusterInfoForWorkflowId(this.rootId)
      : (this.workflowService as any).getRootWorkflow().cluster;
  }

  formatPresetType(type: string): string {
    return (this.clusterModalService as any).formatPresetType(type);
  }

  openCurrentPresetModal(preset: any): void {
    const isSnapshot = (this.workflowService as any).isExecutorForCurrentWorkflowRunning();
    (this.clusterModalService as any).openCurrentClusterModal(preset.clusterType, preset, isSnapshot);
  }

  openClusterSettings(): void {
    (this.clusterModalService as any).openClusterSelectionModal();
  }

  getMenuItems(workflow: any): any[] {
    return workflow ? (this.workflowStatusBarService as any).getMenuItems(workflow) : [];
  }

  isSparkUiAvailable(): boolean {
    return this.workflow.sessionStatus === sessionStatus.RUNNING && this.sparkUiAddress !== undefined;
  }

  isViewerMode(): boolean {
    return this.workflow.sessionStatus === sessionStatus.NOT_RUNNING;
  }

  openDatasources(): void {
    this.datasourcesPanelService.openDatasourcesForBrowsing();
  }
}
