/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Component } from '@angular/core';
import '../workflows/editor/create-node-invitation/create-node-invitation.less';

// Phase C-2 (UI layer): first component migrated from AngularJS to Angular 18 via downgradeComponent.
// create-node-invitation is a static, controller-less, binding-less component, so its template needs
// NO AngularJS->Angular rewrite. Registered as the AngularJS directive 'createNodeInvitation' in
// ng2/bootstrap.ts; the host `ng-if` in editor.html still works (it's an AngularJS attribute on the
// downgraded element). Establishes the component-downgrade pattern for the rest of the UI layer.
@Component({
  selector: 'create-node-invitation',
  template: `
    <div class="create-node-invitation">
      <div class="create-node-invitation__info">
        <div class="create-node-invitation__arrow sa sa-arrow-left"></div>
        <div>
          <div>Drag and drop your first operation node</div>
          <div>or just right click somewhere</div>
        </div>
      </div>

      <div class="create-node-invitation__title">
        Your workflow is empty
      </div>
    </div>
  `
})
export class CreateNodeInvitationComponent {}
