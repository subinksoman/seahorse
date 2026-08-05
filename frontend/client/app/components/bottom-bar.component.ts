/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Component } from '@angular/core';
import { BottomBarService } from '../services/bottom-bar.service';
import '../workflows/workflows-editor/bottom-bar/bottom-bar.less';

// Phase C / editor side panels: migrated from workflows/workflows-editor/bottom-bar (directive + controller).
// The Reports tab toggle at the bottom of the editor. Downgraded as directive 'bottomBar'; its single usage
// in workflows-editor.html has no bindings, so no rebind is needed. Injects the already-migrated Angular
// BottomBarService directly. Clean leaf (template used only ng-click/ng-class/{{}}).
@Component({
  standalone: false,
  selector: 'bottom-bar',
  template: `
    <div class="bottom-bar no-selection">
      <div class="bottom-button" (click)="activatePanel('reportTab')"
           [ngClass]="{ 'active': tabsState.reportTab }">
        <i class="fa fa-file-text bottom-bar-icon"></i>
        <span class="bottom-bar-span">Reports</span>
      </div>
    </div>
  `
})
export class BottomBarComponent {
  tabsState: any;

  constructor(private bottomBarService: BottomBarService) {
    this.tabsState = this.bottomBarService.tabsState;
  }

  activatePanel(panelName: string): void {
    if (this.bottomBarService.tabsState[panelName]) {
      this.bottomBarService.deactivatePanel(panelName);
    } else {
      this.bottomBarService.activatePanel(panelName);
    }
  }
}
