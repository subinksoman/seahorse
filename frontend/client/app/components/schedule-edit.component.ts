/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Component, Input, Output, EventEmitter, OnChanges } from '@angular/core';
import { copy } from '../core/ng-compat';

const EMAIL_REGEXP = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Angular port of the removed edit-schedule component: the schedule editor form (cluster-preset select,
// cron expression, report email + validation). The legacy jq-cron jQuery widget is gone with AngularJS,
// so the cron is a plain text field (min hour day month weekday). Manual bindings — no @angular/forms.
@Component({
  standalone: false,
  selector: 'schedule-edit',
  template: `
    <div class="schedule edit-schedule">
      <div class="schedule__attributes">
        <div class="schedule-attribute schedule-cluster-preset">
          <div class="schedule-attribute__label">Select cluster preset</div>
          <div class="schedule-attribute__errors">
            <p *ngIf="error.presetId.required" class="schedule-attribute-error">Cluster preset is required</p>
          </div>
          <select class="form-control schedule-attribute__input"
                  [class.schedule-attribute__input--invalid]="error.presetId.required"
                  (change)="onPresetChange($any($event.target).value)">
            <option value="">-- choose preset --</option>
            <option *ngFor="let preset of clusterPresets" [value]="preset.id" [selected]="isSelected(preset)">
              {{ preset.name }}
            </option>
          </select>
        </div>

        <div class="schedule-attribute schedule-cron">
          <span class="schedule-attribute__label">Run workflow (cron)</span>
          <input class="form-control schedule-attribute__input"
                 [value]="model.schedule.cron"
                 (input)="model.schedule.cron = $any($event.target).value"
                 placeholder="e.g. 0 12 * * *">
          <div class="schedule-cron__hint">minute&nbsp;hour&nbsp;day-of-month&nbsp;month&nbsp;day-of-week</div>
        </div>

        <div class="schedule-attribute schedule-email">
          <div class="schedule-attribute__label">Send email reports to:</div>
          <div class="schedule-attribute__errors">
            <p *ngIf="error.emailForReports.required || error.emailForReports.email" class="schedule-attribute-error">
              Valid email address is required
            </p>
          </div>
          <input class="form-control schedule-attribute__input"
                 [class.schedule-attribute__input--invalid]="error.emailForReports.required || error.emailForReports.email"
                 [value]="model.executionInfo.emailForReports"
                 (input)="model.executionInfo.emailForReports = $any($event.target).value; validate()">
        </div>
      </div>
      <div class="schedule__actions">
        <button class="btn btn-primary edit-schedule__btn" [disabled]="!valid" (click)="ok()">Ok</button>
        <button class="btn btn-default edit-schedule__btn" (click)="cancelEdit()">Cancel</button>
      </div>
    </div>
  `
})
export class ScheduleEditComponent implements OnChanges {
  @Input() clusterPresets: any[] = [];
  @Input() initialData: any;
  @Output() accept = new EventEmitter<any>();
  @Output() cancel = new EventEmitter<void>();

  valid = true;
  error: any = { emailForReports: {}, presetId: {} };
  model: any = { id: '', schedule: { cron: '' }, executionInfo: { emailForReports: '', presetId: -1 } };

  ngOnChanges(): void {
    if (this.initialData) { this.model = copy(this.initialData); }
    this.validate();
  }

  isSelected(preset: any): boolean {
    return String(preset.id) === String(this.model.executionInfo.presetId);
  }

  onPresetChange(value: string): void {
    if (value === '') {
      this.model.executionInfo.presetId = -1;
    } else {
      const preset = (this.clusterPresets || []).find((p: any) => String(p.id) === value);
      this.model.executionInfo.presetId = preset ? preset.id : value; // preserve the preset's id type
    }
    this.validate();
  }

  validate(): void {
    this.error.presetId.required = !(this.clusterPresets || []).find(
      (p: any) => String(p.id) === String(this.model.executionInfo.presetId));
    this.error.emailForReports.required = !this.model.executionInfo.emailForReports;
    this.error.emailForReports.email = !EMAIL_REGEXP.test(this.model.executionInfo.emailForReports || '');
    this.valid = !(this.error.presetId.required || this.error.emailForReports.required || this.error.emailForReports.email);
  }

  ok(): void { this.accept.emit(this.model); }
  cancelEdit(): void { this.cancel.emit(); }
}
