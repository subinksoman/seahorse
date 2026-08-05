/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Component, Input, Inject } from '@angular/core';

// Phase C / deepsense-attributes: migrated from attribute-types/attribute-workflow. An "Edit workflow"
// button for an inner-workflow parameter. Downgraded 'attributeWorkflowType'; attributes-list passes
// [parameter-name]. The legacy scope.$emit(CLICKED_EDIT_WORKFLOW) -> bridged $rootScope.$broadcast — the
// attributes-panel listener is $scope.$on, which catches a broadcast from $rootScope (an ancestor).
@Component({
  standalone: false,
  selector: 'attribute-workflow-type',
  template: `
    <button class="btn btn-info attributes-list-btn-wide" (click)="editWorkflow()">Edit workflow</button>
  `
})
export class AttributeWorkflowTypeComponent {
  @Input() parameterName: any;

  constructor(@Inject('$rootScope') private $rootScope: any) {}

  editWorkflow(): void {
    this.$rootScope.$broadcast('AttributesPanel.INTERNAL.CLICKED_EDIT_WORKFLOW', {
      parameterName: this.parameterName
    });
  }
}
