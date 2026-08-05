/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Component, Inject } from '@angular/core';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { PresetService } from './preset.service';
import { PRESET_MODAL_LABELS } from './preset-modal-labels';
import { copy } from './ng-compat';

// Phase C / AngularJS removal: cluster preset editor on CDK/ModalService (was preset-modal). Form
// bindings are manual ([value]/(input)/(focus), no @angular/forms); name "dirty" is tracked by hand.
// Instructions render via [innerHTML] (Angular sanitizes the safe static HTML — no ngSanitize/$sce).
// Native PresetService + PRESET_MODAL_LABELS. ok() validates via PresetService then savePreset().
@Component({
  standalone: false,
  template: `
    <div class="modal-content">
      <div class="preset-modal">
        <div class="modal-header preset-modal__header">
          <div class="row form-row" *ngIf="!isEditingEnabled() && !isSaving">
            <div class="col-md-12 editing-blocked">
              <b>Editing is blocked.</b>
              <span>In order to edit this preset, please stop editing your workflow first. </span>
            </div>
          </div>
          <div class="row form-row">
            <div class="col-md-3 title">{{ labels.main }}</div>
            <div class="col-md-9">
              <input class="form-control cluster-input title-input" placeholder="Settings name (required)"
                     [value]="preset.name"
                     (input)="preset.name = $any($event.target).value; nameDirty = true"
                     [disabled]="!isEditingEnabled() || preset.isDefault"
                     [ngClass]="{'error': isPresetNameUsed() || errors['name']}"
                     maxlength="30" (focus)="focused = 'name'"/>
              <div class="change-cluster-btn-section">
                <div>
                  <div class="error-highlight" *ngIf="isPresetNameUsed()">Name already exists, choose another one</div>
                  <div class="error-highlight" *ngIf="errors['name']">{{ errors['name'] }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-body preset-modal__body">
          <div *ngFor="let field of fields">
            <ng-container *ngIf="labels[field]">
              <div class="row main-form-row">
                <div class="col-md-4"><div class="label-main">{{ labels[field].name }}</div></div>
                <div class="col-md-8">
                  <input class="form-control cluster-input {{ field }}-input"
                         [placeholder]="labels[field].placeholder"
                         [value]="preset[field] || ''"
                         (input)="preset[field] = $any($event.target).value"
                         [disabled]="!isEditingEnabled()"
                         [ngClass]="{'error': errors[field]}"
                         (focus)="focused = field" [type]="labels[field].type || 'text'"/>
                  <div class="input-validation-error"><span *ngIf="errors[field]">{{ errors[field] }}</span></div>
                </div>
              </div>
              <div class="row form-row instructions animated fadeIn" [hidden]="focused !== field">
                <div class="col-md-12" [innerHTML]="labels[field].instruction"></div>
              </div>
            </ng-container>
          </div>

          <hr/>
          <div class="row form-row"><div class="col-md-12"><div class="label-main">{{ labels.params.name }}</div></div></div>
          <div class="row form-row instructions" [hidden]="focused !== 'params'">
            <div class="col-md-12" [innerHTML]="labels.params.instruction"></div>
          </div>
          <div class="row form-row">
            <div class="col-md-12 cluster-textarea">
              <textarea class="form-control cluster-input" rows="6" [disabled]="!isEditingEnabled()"
                        [value]="preset.params || ''" (input)="preset.params = $any($event.target).value"
                        [placeholder]="labels.params.placeholder" (focus)="focused = 'params'"></textarea>
            </div>
          </div>
        </div>

        <div class="modal-footer preset-modal__footer">
          <button type="button" class="btn cluster-btn cluster-btn__light" (click)="cancel()">Cancel</button>
          <button type="button" class="btn cluster-btn cluster-btn__blue"
                  [disabled]="!isEditingEnabled() || isPresetNameUsed()" (click)="ok()">
            {{ isSaving ? 'Saving' : 'Save' }}
          </button>
        </div>
      </div>
    </div>
  `
})
export class PresetModalComponent {
  readonly fields = ['uri', 'userIP', 'driverMemory', 'hadoopUser', 'executorMemory',
    'totalExecutorCores', 'executorCores', 'numExecutors'];
  labels: any;
  preset: any;
  private type: string;
  private isSnapshot: boolean;
  focused: string;
  isSaving = false;
  nameDirty = false;
  errors: any = {};

  constructor(
    @Inject(DIALOG_DATA) data: any,
    private dialogRef: DialogRef<any>,
    private presetService: PresetService
  ) {
    this.type = data.type;
    this.isSnapshot = data.isSnapshot;
    this.labels = PRESET_MODAL_LABELS[this.type];
    this.preset = copy(data.preset) || { isEditable: true, isDefault: false };
  }

  isPresetNameUsed(): boolean {
    return this.nameDirty && this.presetService.isNameUsed(this.preset.name);
  }

  isEditingEnabled(): boolean {
    return this.preset.isEditable && !this.isSnapshot && !this.isSaving;
  }

  ok(): void {
    this.preset.clusterType = this.type;
    if (!this.presetService.isValid(this.preset)) {
      this.errors = this.formatErrors(this.presetService.getErrors(), this.type);
    } else {
      this.isSaving = true;
      this.presetService.savePreset(this.preset)
        .then(() => this.dialogRef.close(true))
        .catch((error: any) => {
          // eslint-disable-next-line no-console
          console.error('Problem with saving preset', error, this.preset);
          this.isSaving = false;
        });
    }
  }

  cancel(): void { this.dialogRef.close(undefined); }

  private formatErrors(errors: any[], type: string): any {
    const errorObject: any = {};
    errors.forEach((error: any) => {
      if (error.path !== 'hadoopUser' || type === 'yarn') {
        errorObject[error.path] = error.message;
      }
    });
    return errorObject;
  }
}
