/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Component, Input, Inject, ElementRef, AfterViewChecked } from '@angular/core';
import * as _ from 'lodash';

// Phase C / deepsense-attributes RECURSIVE CORE: migrated from attribute-column... no — from
// deepsense-attributes-panel/attributes-list. The parameter dispatcher: one row per parameter with its
// title + the *ngSwitch to the right attribute-type editor (all Angular now). Downgraded 'attributesList'
// (used from the still-AngularJS attributes-panel) AND used directly as an Angular component in the recursive
// nested types (single/multiple-choice/multiplier/dynamic/gridsearch render <attributes-list> again).
//
// The legacy `require: '^deepsenseOperationAttributes'` (parent panel controller for isInnerWorkflow/
// get+setVisibility) is replaced by explicit @Inputs (node/publicParams/isInnerWorkflow), passed only at the
// ROOT usage from attributes-panel.html — the recursion doesn't need them (visibility icons show only at
// root level). getVisibility/setVisibility are inlined and mutate publicParams IN PLACE (so the panel's array
// ref stays valid). uib-popover -> native title; the label-to-first-unlabeled a11y directive is dropped
// (labels still render). $watch(parameters)->AttributesPanelService.disableElements -> ngAfterViewChecked.
@Component({
  standalone: false,
  selector: 'attributes-list',
  template: `
    <div class="attributes-list">
      <div class="ibox parameter-item" *ngFor="let parameter of parametersList?.parameters">
        <div class="ibox-title">
          <i class="fa fa-table" *ngIf="parameter.schema.isGrid" style="margin-right: 5px"
             title="This parameter is dedicated for Grid Search. It accepts multiple values separated by commas."></i>
          <label>{{ parameter.name }}</label>
          <span *ngIf="isInnerWorkflowRootParam(parameter)" [ngSwitch]="getVisibility(parameter.name)">
            <i class="attributes-list__icon fa fa-lock toggleable-icon" *ngSwitchCase="'private'"
               (click)="setVisibility(parameter.name, 'public')"
               title="This parameter is currently PRIVATE. Click to make it public"></i>
            <i class="attributes-list__icon fa fa-unlock toggleable-icon" *ngSwitchCase="'public'"
               (click)="setVisibility(parameter.name, 'private')"
               title="This parameter is currently PUBLIC. Click to make it private"></i>
          </span>
          <i *ngIf="parameter.schema.description"
             class="attributes-list__icon attributes-list__icon--help fa fa-question-circle"
             [title]="parameter.schema.description"></i>
        </div>
        <div class="ibox-content">
          <div class="attributes-value-view" [ngSwitch]="parameter.schema.type">
            <attribute-boolean-type *ngSwitchCase="'boolean'" [parameter]="parameter"></attribute-boolean-type>
            <attribute-single-choice-type *ngSwitchCase="'choice'" [parameter]="parameter"></attribute-single-choice-type>
            <attribute-multiple-choice-type *ngSwitchCase="'multipleChoice'" [parameter]="parameter"></attribute-multiple-choice-type>
            <attribute-numeric-type *ngSwitchCase="'numeric'" [parameter]="parameter"></attribute-numeric-type>
            <attribute-code-snippet-type *ngSwitchCase="'codeSnippet'"
              [value]="parameter.value" (valueChange)="parameter.value = $event"
              [language]="parameter.schema.language.name"></attribute-code-snippet-type>
            <attribute-workflow-type *ngSwitchCase="'workflow'" [parameterName]="parameter.name"></attribute-workflow-type>
            <attribute-string-type *ngSwitchCase="'string'" [parameter]="parameter"></attribute-string-type>
            <attribute-creator-type *ngSwitchCase="'creator'" [parameter]="parameter"></attribute-creator-type>
            <attribute-prefix-based-creator-type *ngSwitchCase="'prefixBasedCreator'" [parameter]="parameter"></attribute-prefix-based-creator-type>
            <attribute-selector-type *ngSwitchCase="'selector'" [parameter]="parameter"></attribute-selector-type>
            <attribute-multiplier-type *ngSwitchCase="'multiplier'" [parameter]="parameter"></attribute-multiplier-type>
            <attribute-dynamic-param-type *ngSwitchCase="'dynamic'" [parameter]="parameter"></attribute-dynamic-param-type>
            <attribute-gridsearch-param-type *ngSwitchCase="'gridSearch'" [parameter]="parameter"></attribute-gridsearch-param-type>
            <attribute-multiple-numeric-type *ngSwitchCase="'multipleNumeric'" [parameter]="parameter"></attribute-multiple-numeric-type>
            <attribute-load-from-library *ngSwitchCase="'loadFromLibrary'" [parameter]="parameter"></attribute-load-from-library>
            <attribute-save-to-library *ngSwitchCase="'saveToLibrary'" [parameter]="parameter"></attribute-save-to-library>
            <attribute-datasource *ngSwitchCase="'datasourceIdForRead'" [parameter]="parameter"></attribute-datasource>
            <attribute-datasource *ngSwitchCase="'datasourceIdForWrite'" [parameter]="parameter"></attribute-datasource>
          </div>
        </div>
      </div>
      <div class="lead no-parameters" *ngIf="noParamValues()">No parameters</div>
    </div>
  `
})
export class AttributesListComponent implements AfterViewChecked {
  @Input() parametersList: any;
  @Input() isRootLevelParameter: any; // '"true"' string at root (legacy '@' binding), undefined otherwise
  @Input() isInnerWorkflow: any;
  @Input() node: any;
  @Input() publicParams: any;

  constructor(
    private host: ElementRef,
    @Inject('AttributesPanelService') private AttributesPanelService: any
  ) {}

  ngAfterViewChecked(): void {
    // Legacy $watch(parameters) -> disableElements: mask inputs when the panel is in disabled mode
    // (no-op when enabled; the panel re-enables on its whole host when disabled mode turns off).
    this.AttributesPanelService.disableElements(this.host.nativeElement);
  }

  noParamValues(): boolean {
    return !!(this.parametersList && this.parametersList.parameters &&
      Object.keys(this.parametersList.parameters).length === 0);
  }

  isDynamic(parameter: any): boolean {
    return parameter.schema.type === 'dynamic';
  }

  isInnerWorkflowRootParam(parameter: any): boolean {
    return !!(this.isInnerWorkflow && this.isRootLevelParameter && !this.isDynamic(parameter));
  }

  getVisibility(parameterName: string): string {
    const publicParam = _.find(this.publicParams,
      (pp: any) => pp.paramName === parameterName && this.node && pp.nodeId === this.node.id);
    return publicParam ? 'public' : 'private';
  }

  setVisibility(parameterName: string, visibility: string): void {
    if (!Array.isArray(this.publicParams) || !this.node) {
      return;
    }
    if (visibility === 'public') {
      this.publicParams.push({ nodeId: this.node.id, paramName: parameterName, publicName: parameterName });
    } else if (visibility === 'private') {
      // Mutate in place (splice) so the panel's array reference stays valid.
      _.forEachRight(this.publicParams, (pp: any, i: number) => {
        if (pp.paramName === parameterName && pp.nodeId === this.node.id) {
          this.publicParams.splice(i, 1);
        }
      });
    }
  }
}
