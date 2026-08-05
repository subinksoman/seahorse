/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Component, Input, Output, EventEmitter, OnChanges } from '@angular/core';
import { copy } from '../core/ng-compat';
import { WorkflowSchedulesService } from '../services/workflow-schedules.service';

// Angular port of the removed schedule component: one saved schedule — a preview (cluster preset / cron
// / email) with edit + delete actions; editing swaps in <schedule-edit>.
@Component({
  standalone: false,
  selector: 'schedule',
  template: `
    <div class="schedule">
      <div *ngIf="!editing" class="schedule__actions">
        <span class="schedule-action fa fa-pencil" (click)="edit()" title="Edit schedule"></span>
        <span class="schedule-action sa sa-delete fa fa-times" (click)="deleteSchedule()" title="Delete schedule"></span>
      </div>

      <div *ngIf="!editing" class="schedule__preview">
        <div class="schedule-attribute schedule-cluster-preset">
          <div class="schedule-attribute__label">Cluster preset:</div>
          <div *ngIf="!presetInvalid" class="schedule-attribute__value" [title]="presetName">{{ presetName }}</div>
          <div *ngIf="presetInvalid"
               class="schedule-attribute__value schedule-attribute__value--invalid schedule-attribute__value--clickable"
               (click)="edit()">Select execution cluster</div>
        </div>

        <div class="schedule-attribute schedule-cron">
          <span class="schedule-attribute__label">Run workflow (cron): </span>
          <span class="schedule-attribute__value">{{ model.schedule.cron }}</span>
        </div>

        <div class="schedule-attribute schedule-email">
          <div class="schedule-attribute__label">Reports send to:</div>
          <div class="schedule-attribute__value" [title]="model.executionInfo.emailForReports">
            {{ model.executionInfo.emailForReports }}
          </div>
        </div>
      </div>

      <schedule-edit *ngIf="editing"
        [clusterPresets]="clusterPresets"
        [initialData]="model"
        (accept)="onAccept($event)"
        (cancel)="cancelEdit()">
      </schedule-edit>
    </div>
  `
})
export class ScheduleComponent implements OnChanges {
  @Input() clusterPresets: any[] = [];
  @Input() initialData: any;
  @Output() delete = new EventEmitter<void>();
  @Output() update = new EventEmitter<any>();

  editing = false;
  presetName = '';
  presetInvalid = false;
  model: any = { id: '', schedule: { cron: '' }, executionInfo: { emailForReports: '', presetId: -1 } };

  constructor(private workflowSchedules: WorkflowSchedulesService) {}

  ngOnChanges(): void {
    if (this.initialData) { this.model = copy(this.initialData); }
    this.updatePreview();
  }

  private updatePreview(): void {
    const preset = (this.clusterPresets || []).find(
      (p: any) => String(p.id) === String(this.model.executionInfo.presetId));
    this.presetInvalid = !preset;
    this.presetName = preset ? preset.name : '';
  }

  edit(): void { this.editing = true; }
  cancelEdit(): void { this.editing = false; }

  deleteSchedule(): void {
    this.workflowSchedules.deleteSchedule(this.model.id).then(() => this.delete.emit());
  }

  onAccept(schedule: any): void {
    this.workflowSchedules.updateSchedule(schedule).then(
      (updated: any) => {
        this.model = updated || schedule;
        this.updatePreview();
        this.editing = false;
        this.update.emit(this.model);
      },
      () => { this.cancelEdit(); }
    );
  }
}
