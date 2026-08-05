/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Component, Input, OnInit, DoCheck } from '@angular/core';

// Phase C / deepsense-attributes recursive core: migrated from attribute-types/attribute-dynamic-param
// (also reused for gridsearch — identical). Renders a nested <attributes-list> over a buffered copy of the
// parameter's inferred internal params. The DynamicParamTypeService two-way JSON-compared $watches
// (internalParams <-> bufferedInternalParams) are inlined in ngDoCheck; $compile -> Angular recursion.
@Component({
  standalone: false,
  selector: 'attribute-dynamic-param-type, attribute-gridsearch-param-type',
  template: `
    <div>
      <div class="nested-attributes-view">
        <attributes-list *ngIf="parameter?.internalParamsAvailable" [parametersList]="bufferedInternalParams"></attributes-list>
        <p *ngIf="parameter && !parameter.internalParamsAvailable">Parameters can not be inferred in current state</p>
      </div>
    </div>
  `
})
export class AttributeDynamicParamTypeComponent implements OnInit, DoCheck {
  @Input() parameter: any;
  bufferedInternalParams: any;
  private lastInternalJson = '';
  private lastBufferJson = '';

  ngOnInit(): void {
    if (this.parameter) {
      this.bufferedInternalParams = this.parameter.internalParams;
      this.lastInternalJson = JSON.stringify(this.parameter.internalParams);
      this.lastBufferJson = this.lastInternalJson;
    }
  }

  ngDoCheck(): void {
    if (!this.parameter) { return; }
    const internalJson = JSON.stringify(this.parameter.internalParams);
    if (internalJson !== this.lastInternalJson) {
      // internalParams changed externally (re-inferred) -> refresh the buffer.
      this.bufferedInternalParams = this.parameter.internalParams;
      this.lastInternalJson = internalJson;
      this.lastBufferJson = internalJson;
      return;
    }
    const bufferJson = JSON.stringify(this.bufferedInternalParams);
    if (bufferJson !== this.lastBufferJson) {
      // buffer edited by the user -> push back to internalParams.
      this.parameter.internalParams = this.bufferedInternalParams;
      this.lastBufferJson = bufferJson;
      this.lastInternalJson = bufferJson;
    }
  }
}
