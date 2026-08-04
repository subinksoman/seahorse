/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Injectable, Inject } from '@angular/core';
// additionalHtmlForOwner is now a popover KEY (not an HTML URL): the migrated <menu-item> switches
// on it to render the downgraded <starting-popover>/<running-executor-popover>/<executor-error>.
import { sessionStatus } from '../enums/session-status.js';
import { WorkflowService } from './workflow.service';
import { UserService } from './user.service';

declare const angular: any; // global (expose-loader) — used for angular.copy of menu-item variants

// Phase C-1: migrated from workflows/workflows-status-bar/workflows-editor-status-bar.service.js.
// Builds the status-bar menu-item view for the current workflow/session state. Now clean: injects the
// Angular WorkflowService + UserService directly; $rootScope bridged. Public surface (getMenuItems)
// unchanged; downgraded as 'WorkflowStatusBarService'.
@Injectable({ providedIn: 'root' })
export class WorkflowStatusBarService {
  private menuItems: any;
  private _menuItemViews: any;

  constructor(
    @Inject('$rootScope') private $rootScope: any,
    private workflowService: WorkflowService,
    private userService: UserService
  ) {
    const menuItems: any = {
      clone: {
        label: 'Clone',
        callFunction: () => this.$rootScope.$broadcast('StatusBar.CLONE_WORKFLOW')
      },
      export: {
        label: 'Export',
        callFunction: () => this.$rootScope.$broadcast('StatusBar.EXPORT_CLICK')
      },
      run: {
        label: 'Run',
        forOwnerOnly: true,
        callFunction: () => this.$rootScope.$broadcast('StatusBar.RUN')
      },
      startEditing: {
        label: 'Start editing',
        forOwnerOnly: true,
        icon: 'fa-play',
        callFunction: () => this.$rootScope.$emit('StatusBar.START_EDITING'),
        additionalHtmlForOwner: 'starting'
      },
      startingEditing: {
        label: 'Starting...',
        icon: 'fa-cog',
        additionalClass: 'menu-item-disabled',
        additionalIconClass: 'fa-spin',
        additionalHtmlForOwner: 'running'
      },
      executorError: {
        label: 'Executor error',
        icon: 'fa-ban',
        additionalClass: 'disabled',
        additionalHtmlForOwner: 'error'
      },
      stopEditing: {
        label: 'Stop editing',
        icon: 'fa-stop',
        callFunction: () => this.$rootScope.$emit('StatusBar.STOP_EDITING')
      },
      abort: {
        label: 'Abort',
        callFunction: () => this.$rootScope.$broadcast('StatusBar.ABORT')
      },
      aborting: {
        label: 'Aborting...',
        additionalClass: 'menu-item-disabled'
      },
      closeInnerWorkflow: {
        label: 'Close inner workflow',
        icon: 'fa-ban',
        callFunction: () => this.$rootScope.$broadcast('StatusBar.CLOSE-INNER-WORKFLOW')
      }
    };

    menuItems.disabledClone = angular.copy(menuItems.clone);
    menuItems.disabledClone.additionalClass = 'menu-item-disabled';

    menuItems.disabledStartEditing = angular.copy(menuItems.startEditing);
    menuItems.disabledStartEditing.additionalClass = 'menu-item-disabled';

    menuItems.disabledStopEditing = angular.copy(menuItems.stopEditing);
    menuItems.disabledStopEditing.additionalClass = 'menu-item-disabled';

    menuItems.disabledExport = angular.copy(menuItems.export);
    menuItems.disabledExport.additionalClass = 'menu-item-disabled';

    menuItems.disabledRun = angular.copy(menuItems.run);
    menuItems.disabledRun.additionalClass = 'menu-item-disabled';

    this.menuItems = menuItems;

    this._menuItemViews = {
      editorExecutorRunning: [menuItems.stopEditing, menuItems.clone, menuItems.run, menuItems.export],
      editorExecutorCreating: [menuItems.startingEditing, menuItems.clone, menuItems.disabledRun, menuItems.export],
      editorExecutorNotRunning: [menuItems.startEditing, menuItems.clone, menuItems.disabledRun, menuItems.export],
      editorExecutorError: [menuItems.executorError, menuItems.clone, menuItems.disabledRun, menuItems.export],
      editorReadOnlyForNotOwner: [menuItems.disabledStartEditing, menuItems.clone, menuItems.disabledRun, menuItems.export],
      running: [menuItems.disabledStopEditing, menuItems.clone, menuItems.abort, menuItems.export],
      aborting: [menuItems.disabledStopEditing, menuItems.disabledClone, menuItems.aborting, menuItems.disabledExport],
      editInnerWorkflow: [menuItems.closeInnerWorkflow]
    };
  }

  private isOwner(): boolean {
    return this.workflowService.getCurrentWorkflow().owner.id === this.userService.getSeahorseUser().id;
  }

  getMenuItems(workflow: any): any {
    const view = this._getView(workflow);
    return this._menuItemViews[view];
  }

  private _getView(workflow: any): string {
    // TODO Refactor this code.
    switch (workflow.workflowType) {
      case 'root':
        if (!this.isOwner()) {
          return 'editorReadOnlyForNotOwner';
        }
        switch (workflow.workflowStatus) {
          case 'editor':
            switch (workflow.sessionStatus) {
              case sessionStatus.NOT_RUNNING:
                return 'editorExecutorNotRunning';
              case sessionStatus.CREATING:
                return 'editorExecutorCreating';
              case sessionStatus.RUNNING:
                return 'editorExecutorRunning';
              case sessionStatus.ERROR:
                return 'editorExecutorError';
              default:
                throw `Unsupported session status: ${workflow.sessionStatus}`;
            }
          case 'aborting':
          case 'running':
            return workflow.workflowStatus;
          default:
            throw `Unsupported workflow status: ${workflow.workflowStatus}`;
        }
      case 'inner':
        if (workflow.workflowStatus === 'editor') {
          return 'editInnerWorkflow';
        } else {
          throw 'Cannot run inner workflow';
        }
      default:
        return '';
    }
  }
}
