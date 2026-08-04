/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Component } from '@angular/core';
import logo from 'ASSETS/images/deepsense-logo.svg';

// Phase C / navigation-bar: migrated from workflows/navigation-bar/{drv,ctrl,html}. A static left
// nav rail with the logo linking home. The legacy NavigationController only exposed getAPIVersion
// (config.editorVersion), which the template never used — dropped. Downgraded 'navigationBar';
// used (no bindings) in the AngularJS workflows.html. Logo imported as a webpack asset.
@Component({
  standalone: false,
  selector: 'navigation-bar',
  template: `
    <nav class="c-navbar u-flex" role="navigation" style="display: flex; flex-direction: column;">
      <a class="c-navbar__link" href="#" title="Return home">
        <img [src]="logo" alt="Logo" class="c-navbar__logo"/>
      </a>
    </nav>
  `
})
export class NavigationBarComponent {
  readonly logo = logo;
}
