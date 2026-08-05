/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Component, Input, OnInit, OnChanges } from '@angular/core';
import './schedules.less';
import { WorkflowSchedulesService } from '../services/workflow-schedules.service';
import { PresetService } from '../services/preset.service';

// Angular port of the removed workflow-schedules component — the schedules panel in the editor's
// general-data-panel: an "Add schedule" toggle + the list of a workflow's schedules. Restores the
// feature dropped during the AngularJS removal (the subsystem was framework-agnostic-ported here).
@Component({
  standalone: false,
  selector: 'workflow-schedules',
  template: `
    <div class="workflow-schedules">
      <button class="btn o-general-data-panel__btn workflow-schedules__add-new"
              [class.btn-gray]="addingSchedule" [class.btn-info]="!addingSchedule"
              (click)="toggleAddingSchedule()">Add schedule</button>

      <div *ngIf="addingSchedule" class="workflow-schedules__item">
        <schedule-edit [clusterPresets]="presets" [initialData]="newScheduleStub"
                       (accept)="addSchedule($event)" (cancel)="cancelAddingSchedule()"></schedule-edit>
      </div>

      <div *ngFor="let schedule of visibleSchedules" class="workflow-schedules__item">
        <schedule [clusterPresets]="presets" [initialData]="schedule"
                  (delete)="getSchedules()" (update)="getSchedules()"></schedule>
      </div>

      <div class="workflow-schedules__status-message" *ngIf="!schedules.length && !addingSchedule">
        Schedules allow you to run workflow automatically.
      </div>
    </div>
  `
})
export class WorkflowSchedulesComponent implements OnInit, OnChanges {
  @Input() workflow: any;

  presets: any[] = [];
  schedules: any[] = [];
  visibleSchedules: any[] = [];
  addingSchedule = false;
  newScheduleStub: any;
  private loadedForId: string;

  constructor(private workflowSchedules: WorkflowSchedulesService, private presetService: PresetService) {}

  ngOnInit(): void {
    (this.presetService as any).fetch().then(() => {
      const all = this.presetService.getAll() || {};
      this.presets = Object.keys(all).map((k) => ({ name: all[k].name, id: all[k].id }));
    }).catch(() => {});
    this.getSchedules();
  }

  ngOnChanges(): void {
    // workflow is a binding — (re)load when its id first arrives or changes.
    if (this.workflow && this.workflow.id && this.workflow.id !== this.loadedForId) {
      this.getSchedules();
    }
  }

  getSchedules(): void {
    if (!this.workflow || !this.workflow.id) { return; }
    this.loadedForId = this.workflow.id;
    this.workflowSchedules.fetchSchedules(this.workflow.id).then((schedules: any[]) => {
      this.schedules = schedules || [];
      this.visibleSchedules = this.schedules.slice().reverse();
    });
  }

  toggleAddingSchedule(): void {
    if (!this.addingSchedule) {
      this.newScheduleStub = this.workflowSchedules.generateScheduleStub(this.workflow.id);
    }
    this.addingSchedule = !this.addingSchedule;
  }

  cancelAddingSchedule(): void { this.addingSchedule = false; }

  addSchedule(schedule: any): void {
    this.workflowSchedules.updateSchedule(schedule).then(() => {
      this.getSchedules();
      this.addingSchedule = false;
    });
  }
}
