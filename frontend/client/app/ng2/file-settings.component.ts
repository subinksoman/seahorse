/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';

declare const angular: any; // global — angular.copy

const DEFAULT_CSV_FILE_FORMAT_PARAMS = {
  includeHeader: true, convert01ToBoolean: false, separatorType: 'comma', customSeparator: ''
};

// Phase C / AngularJS removal: native Angular port of the file-settings component (format + CSV
// options + separator). Declared (NOT downgraded), so it serves the CDK datasource modals; the
// AngularJS `fileSettings` component stays registered for the still-uib library-datasource modal —
// same element name, different compilation contexts, no collision (parallel-registration pattern).
@Component({
  standalone: false,
  selector: 'file-settings',
  template: `
    <div class="file-settings">
      <div class="file-settings__row-wrapper">
        <div class="title-row">Format</div>
        <div class="inputs-row vertical-align-bottom">
          <div class="col">
            <select class="form-control" [disabled]="disabledMode"
                    (change)="fileFormat = $any($event.target).value; updateFileSettings()">
              <option *ngFor="let format of formats" [value]="format" [selected]="format === fileFormat">
                {{ format | uppercase }}
              </option>
            </select>
          </div>
          <div *ngIf="fileFormat === 'csv'" class="checkboxes-wrapper">
            <div class="col checkbox-wrapper">
              <label class="format-form-label"
                     [ngClass]="{'active': csvFileFormatParams.includeHeader, 'disabled': disabledMode}">
                <input [disabled]="disabledMode" type="checkbox" [checked]="csvFileFormatParams.includeHeader"
                       (change)="csvFileFormatParams.includeHeader = $any($event.target).checked; updateFileSettings()"/>
                <span>First row includes column names</span>
              </label>
            </div>
            <div class="col checkbox-wrapper">
              <label class="format-form-label"
                     [ngClass]="{'active': csvFileFormatParams.convert01ToBoolean, 'disabled': disabledMode}">
                <input [disabled]="disabledMode" type="checkbox" [checked]="csvFileFormatParams.convert01ToBoolean"
                       (change)="csvFileFormatParams.convert01ToBoolean = $any($event.target).checked; updateFileSettings()"/>
                <span>Convert 0 and 1 to boolean</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <div *ngIf="fileFormat === 'csv'" class="file-settings__row-wrapper">
        <div class="title-row">Separator</div>
        <div class="inputs-row space-between">
          <div class="radio-wrapper" *ngFor="let sep of separators">
            <label class="format-form-label"
                   [ngClass]="{'active': csvFileFormatParams.separatorType === sep.value, 'disabled': disabledMode}">
              <input [disabled]="disabledMode" type="radio" name="fs-separator"
                     [checked]="csvFileFormatParams.separatorType === sep.value"
                     (change)="csvFileFormatParams.separatorType = sep.value; updateFileSettings()"/>
              <span class="radio-title" *ngIf="sep.value !== 'custom'">{{ sep.label }}</span>
              <span class="radio-title" *ngIf="sep.value === 'custom'">
                <div class="icon-input">
                  <input [disabled]="disabledMode" maxlength="1" placeholder="custom" id="custom-separator" type="text"
                         [value]="csvFileFormatParams.customSeparator"
                         (input)="csvFileFormatParams.customSeparator = $any($event.target).value; updateFileSettings()"
                         (focus)="onCustomSeparatorInputFocus()"/>
                  <div *ngIf="!disabledMode && csvFileFormatParams.separatorType === 'custom'" class="icon-input__status">
                    <div [ngClass]="{
                           'sa-ok status-ok': csvFileFormatParams.customSeparator,
                           'sa-cross status-error': !csvFileFormatParams.customSeparator
                         }" class="sa icon"></div>
                  </div>
                </div>
              </span>
            </label>
          </div>
        </div>
      </div>
    </div>
  `
})
export class FileSettingsComponent implements OnChanges {
  @Input() fileSettings: any;
  @Input() disabledMode: boolean;
  @Output() onChange = new EventEmitter<any>();

  readonly formats = ['csv', 'json', 'parquet'];
  readonly separators = [
    { value: 'comma', label: ', (comma)' },
    { value: 'semicolon', label: '; (semicolon)' },
    { value: 'colon', label: ': (colon)' },
    { value: 'space', label: 'space' },
    { value: 'tab', label: 'tab' },
    { value: 'custom', label: '' }
  ];
  fileFormat: string;
  csvFileFormatParams: any = { ...DEFAULT_CSV_FILE_FORMAT_PARAMS };

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.fileSettings && this.fileSettings) {
      this.fileFormat = this.fileSettings.fileFormat;
      this.csvFileFormatParams = angular.copy(this.fileSettings.csvFileFormatParams || DEFAULT_CSV_FILE_FORMAT_PARAMS);
    }
  }

  onCustomSeparatorInputFocus(): void {
    this.csvFileFormatParams.separatorType = 'custom';
    this.updateFileSettings();
  }

  updateFileSettings(): void {
    const fileSettings: any = { fileFormat: this.fileFormat };
    if (this.fileFormat === 'csv') {
      fileSettings.csvFileFormatParams = this.csvFileFormatParams;
      if (fileSettings.csvFileFormatParams.separatorType !== 'custom') {
        fileSettings.csvFileFormatParams.customSeparator = '';
      }
    }
    this.onChange.emit(fileSettings);
  }
}
