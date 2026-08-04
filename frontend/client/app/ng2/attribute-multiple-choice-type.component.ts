/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Component, Input, OnInit } from '@angular/core';
import * as _ from 'lodash';

// Phase C / deepsense-attributes recursive core: migrated from attribute-types/attribute-multiple-choice.
// Checkboxes selecting several options; each checked option's sub-parameters render via a nested
// <attributes-list>. $compile nesting -> Angular recursion; ui-switch -> CSS toggle (same as boolean).
@Component({
  standalone: false,
  selector: 'attribute-multiple-choice-type',
  template: `
    <div class="multiple-choice-panel">
      <div *ngFor="let cn of choiceNames" class="ibox choice-item">
        <label>
          <span class="ds-switch">
            <input type="checkbox" [checked]="choices[cn]" (change)="onToggle(cn, $any($event.target).checked)">
            <span class="ds-switch__slider"></span>
          </span>
          <span>{{ cn }}</span>
        </label>
        <div class="nested-attributes-view">
          <attributes-list *ngIf="parameter.choices[cn]" [parametersList]="parameter.possibleChoicesList[cn]"></attributes-list>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .ds-switch { position: relative; display: inline-block; width: 34px; height: 18px; vertical-align: middle; }
    .ds-switch input { opacity: 0; width: 0; height: 0; position: absolute; }
    .ds-switch__slider { position: absolute; cursor: pointer; inset: 0; background: #E43B11; border-radius: 18px; transition: background .2s; }
    .ds-switch__slider::before { content: ''; position: absolute; height: 14px; width: 14px; left: 2px; top: 2px; background: #fff; border-radius: 50%; transition: transform .2s; }
    .ds-switch input:checked + .ds-switch__slider { background: #1ab394; }
    .ds-switch input:checked + .ds-switch__slider::before { transform: translateX(16px); }
  `]
})
export class AttributeMultipleChoiceTypeComponent implements OnInit {
  @Input() parameter: any;
  choices: { [key: string]: boolean } = {};

  get choiceNames(): string[] {
    return this.parameter && this.parameter.possibleChoicesList ? Object.keys(this.parameter.possibleChoicesList) : [];
  }

  ngOnInit(): void {
    this.initChoices();
  }

  private initChoices(): void {
    if (this.parameter.isDefault) {
      this.choices = {};
      for (const cn of this.choiceNames) { this.choices[cn] = false; }
      const defaultValue = this.parameter.schema.default;
      if (defaultValue !== null && typeof defaultValue === 'object') {
        for (const cn of this.choiceNames) { this.choices[cn] = cn in defaultValue; }
      } else if (defaultValue !== null) {
        this.choices[defaultValue] = true;
      }
    } else {
      this.choices = _.assign({}, this.parameter.choices);
    }
  }

  onToggle(choiceName: string, checked: boolean): void {
    this.choices[choiceName] = checked;
    this.parameter.choices = this.choices;
    this.parameter.isDefault = false;
  }
}
