/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Component, Input, OnInit, DoCheck } from '@angular/core';

// Phase C / deepsense-attributes recursive core: migrated from attribute-types/attribute-single-choice.
// A dropdown choosing one option; the chosen option's sub-parameters render via a nested <attributes-list>.
// The legacy $compile of the nested list becomes a real Angular <attributes-list> recursion.
@Component({
  standalone: false,
  selector: 'attribute-single-choice-type',
  template: `
    <div>
      <select class="form-control" [value]="choice" (change)="onChoiceChange($any($event.target).value)">
        <option *ngFor="let cn of choiceNames" [value]="cn">{{ cn }}</option>
      </select>
      <div class="nested-attributes-view">
        <ng-container *ngFor="let cn of choiceNames">
          <attributes-list *ngIf="choice === cn" [parametersList]="parameter.possibleChoicesList[cn]"></attributes-list>
        </ng-container>
      </div>
    </div>
  `
})
export class AttributeSingleChoiceTypeComponent implements OnInit, DoCheck {
  @Input() parameter: any;
  choice: string | null = null;
  private lastListJson = '';

  get choiceNames(): string[] {
    return this.parameter && this.parameter.possibleChoicesList ? Object.keys(this.parameter.possibleChoicesList) : [];
  }

  ngOnInit(): void {
    this.initChoice();
    this.lastListJson = JSON.stringify(this.parameter && this.parameter.possibleChoicesList);
  }

  // Legacy deep $watch(possibleChoicesList): editing an inner value of the default choice marks it selected.
  ngDoCheck(): void {
    if (!this.parameter) { return; }
    const json = JSON.stringify(this.parameter.possibleChoicesList);
    if (json !== this.lastListJson) {
      this.lastListJson = json;
      if (this.choice) { this.parameter.choices[this.choice] = true; }
    }
  }

  private initChoice(): void {
    this.choice = null;
    for (const choiceName in this.parameter.choices) {
      if (this.parameter.choices[choiceName]) {
        this.choice = choiceName;
        return;
      }
    }
    const defaultValue = this.parameter.schema.default;
    this.choice = (defaultValue !== null && typeof defaultValue === 'object')
      ? Object.keys(defaultValue)[0] : defaultValue;
  }

  onChoiceChange(newValue: string): void {
    const oldValue = this.choice;
    if (newValue !== oldValue) {
      if (oldValue) { this.parameter.choices[oldValue] = false; }
      this.parameter.choices[newValue] = true;
      this.choice = newValue;
    }
  }
}
