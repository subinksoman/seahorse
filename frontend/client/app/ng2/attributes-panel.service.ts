/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Injectable } from '@angular/core';

declare const jQuery: any;

// Phase C / AngularJS removal: native port of deepsense-attributes-panel/attributes-panel.service.js.
// Holds the panel's disabled-mode flag and enables/disables all inputs in a container (jQuery, a global).
// Injected by the 3 ng2 attribute consumers via the 'AttributesPanelService' string token (aliased to
// this class in bootstrap.ts — was the AngularJS bridge). No dependencies.
@Injectable({ providedIn: 'root' })
export class AttributesPanelService {
  private disabledMode = false;

  setDisabledMode(): void { this.disabledMode = true; }
  setEnabledMode(): void { this.disabledMode = false; }
  getDisabledMode(): boolean { return this.disabledMode; }

  disableElements(container: any): void {
    if (this.getDisabledMode()) {
      jQuery(':input:not(.o-error-btn), textarea', container).attr('disabled', 'disabled');
    }
  }

  enableElements(container: any): void {
    jQuery(':input:not(.o-error-btn), textarea', container).removeAttr('disabled');
  }
}
