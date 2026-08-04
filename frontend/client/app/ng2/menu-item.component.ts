/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Component, Input } from '@angular/core';
import { WorkflowService } from './workflow.service';
import { UserService } from './user.service';

// Phase C / workflows-status-bar: migrated from menu-item/{directive,controller,html}. A single
// status-bar button. Hosted inside the (Angular) workflows-editor-status-bar template, so the inputs
// are bound camelCase. The legacy <ng-include src="additionalHtmlForOwner"> (a dynamic template URL)
// is replaced by an *ngSwitch on a popover KEY -> the migrated <starting-popover> / <running-executor
// -popover> / <executor-error> components. uib-popover -> native title. ng-href/ng-style/ng-class ->
// [attr.href]/[ngStyle]/[ngClass].
@Component({
  standalone: false,
  selector: 'menu-item',
  template: `
    <div class="button-wrapper">
      <a class="status-bar-item"
         [ngClass]="additionalClass"
         (click)="callFunction && callFunction()"
         [attr.href]="href || null"
         [ngStyle]="{ 'background-color': color }"
         [attr.target]="target || null">
        <span class="c-workflows-status-bar__icon" *ngIf="icon">
          <i [ngClass]="additionalIconClass" class="fa {{ icon }}"></i>
        </span>

        <div class="c-workflows-status-bar__text">
          <span class="c-workflows-status-bar__text-label">{{ label }}</span>
          <span class="c-workflows-status-bar__text-small-label" *ngIf="forOwnerOnly && !isOwner()">
            Owner only
          </span>
        </div>
        <span class="c-workflows-status-bar__popover-span" [title]="label"></span>
      </a>

      <ng-container *ngIf="additionalHtmlForOwner && isOwner()" [ngSwitch]="additionalHtmlForOwner">
        <starting-popover *ngSwitchCase="'starting'"></starting-popover>
        <running-executor-popover *ngSwitchCase="'running'"></running-executor-popover>
        <executor-error *ngSwitchCase="'error'"></executor-error>
      </ng-container>
    </div>
  `
})
export class MenuItemComponent {
  @Input() label: string;
  @Input() forOwnerOnly: any;
  @Input() icon: string;
  @Input() callFunction: () => void;
  @Input() href: string;
  @Input() target: string;
  @Input() color: string;
  @Input() additionalClass: string;
  @Input() additionalIconClass: string;
  @Input() additionalHtmlForOwner: string;

  constructor(
    private workflowService: WorkflowService,
    private userService: UserService
  ) {}

  isOwner(): boolean {
    return (this.workflowService as any).getCurrentWorkflow().owner.id ===
      (this.userService as any).getSeahorseUser().id;
  }
}
