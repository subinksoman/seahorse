/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Injectable, Inject } from '@angular/core';

// Phase C-1: migrated from workflows/workflows-editor/bottom-bar/bottom-bar.service.js. Drives the
// resizable bottom report panel by broadcasting Resizable.CHANGE/FIT on the (bridged) $rootScope.
// Public surface (tabsState, activatePanel, deactivatePanel) unchanged; downgraded as 'BottomBarService'.
@Injectable({ providedIn: 'root' })
export class BottomBarService {
  tabsState = {
    reportTab: false
  };

  constructor(
    @Inject('$rootScope') private $rootScope: any
  ) {}

  activatePanel(panelName: string): void {
    (this.tabsState as any)[panelName] = true;
    let height: string;
    const bottomTab = JSON.parse(localStorage.getItem('bottomTab') as string);
    if (!bottomTab || !bottomTab.height) {
      height = 250 + 'px';
    } else {
      height = bottomTab.height + 'px';
    }

    this.$rootScope.$broadcast('Resizable.CHANGE', {
      selector: '.c-workflow-container__content',
      amount: height
    });

    this.$rootScope.$broadcast('Resizable.FIT', {
      name: 'height',
      amount: height,
      selector: '.c-bottom-tabs'
    });
  }

  deactivatePanel(panelName: string): void {
    (this.tabsState as any)[panelName] = false;

    this.$rootScope.$broadcast('Resizable.CHANGE', {
      selector: '.c-workflow-container__content',
      amount: '25px'
    });

    this.$rootScope.$broadcast('Resizable.FIT', {
      name: 'height',
      amount: '25px',
      selector: '.c-bottom-tabs'
    });
  }
}
