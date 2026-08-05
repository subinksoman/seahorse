/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Component, OnInit, DoCheck, Inject } from '@angular/core';
import * as _ from 'lodash';
import moment from 'moment';
import logo from 'ASSETS/images/deepsense-logo.svg';
import seahorseMain from 'ASSETS/images/seahorse-main.png';
import { WorkflowService } from '../services/workflow.service';
import { UserService } from '../services/user.service';
import { SessionManager } from '../services/session-manager.service';
import { SessionManagerApi } from '../api/session-manager-api.service';
import { ConfirmationModalService } from '../services/confirmation-modal.service';
import { WorkflowCloneService } from '../services/workflow-clone.service';
import { Router } from '@angular/router';
import { ModalService } from '../modals/modal.service';
import { NewWorkflowModalComponent } from '../modals/new-workflow-modal.component';
import { UploadWorkflowModalComponent } from '../modals/upload-workflow-modal.component';

// Phase C / router track (step 2): migrated from home/home.ctrl.js + home.html. The workflow-list
// landing view. Downgraded 'homeView'; the ui-router 'home' state template now hosts <home-view>.
// The two "New/Upload workflow" dialogs stay AngularJS uib-modals, opened through bridged $uibModal
// (their controllers are not migrated yet). Filter + orderBy pipes -> a computed getVisibleWorkflows();
// the deep $rootScope.$watch that refreshed session status -> ngDoCheck. $state.go stays bridged for
// now (becomes Router.navigate when ui-router is swapped). uib-popover -> native title.
@Component({
  standalone: false,
  selector: 'home-view',
  template: `
    <div class="panel panel-default no-border home-screen">
      <a href="#" target="_blank" class="deepsense-logo">
        <img alt="logo" [src]="logo">
      </a>
      <div class="panel panel-default no-border home-screen">
        <div class="panel-heading text-center logo">
          <img [src]="seahorseMain">
        </div>

        <div class="btn-group btn-group-justified" role="group">
          <div class="btn-group" role="group">
            <button type="button" class="btn-yellow btn text-uppercase btn-workflow btn-workflow__new"
                    (click)="displayCreateWorkflowPopup($event)" [disabled]="!isReady()">New Workflow
            </button>
          </div>
          <div class="btn-group" role="group">
            <button type="button" class="btn-blue btn text-uppercase btn-workflow btn-workflow__upload"
                    (click)="displayUploadWorkflowPopup($event)" [disabled]="!isReady()">Upload Workflow
            </button>
          </div>
        </div>

        <deepsense-loading-spinner-sm *ngIf="isLoading()"></deepsense-loading-spinner-sm>

        <div *ngIf="isReady()">
          <div *ngIf="workflows.length > 0">
            <div class="input-group search-field">
              <input type="text" class="text-center form-control input-search-workflow"
                     [value]="filterString || ''" (input)="filterString = $event.target.value"
                     placeholder="SEARCH...">
            </div>
            <table class="table table-striped text-center table-workflows">
              <tr class="header text-uppercase">
                <td class="color-gray table__small table__centered table__cell"><b>No.</b></td>
                <td class="color-gray sortable table__cell" (click)="sortBy('name')">
                  <b>Name</b> <span><i [ngClass]="getClass('name')"></i></span>
                </td>
                <td class="color-gray sortable table__cell" (click)="sortBy('ownerName')">
                  <b>Owner</b> <span><i [ngClass]="getClass('ownerName')"></i></span>
                </td>
                <td class="color-gray sortable table__cell" (click)="sortBy('description')">
                  <b>Description</b> <span><i [ngClass]="getClass('description')"></i></span>
                </td>
                <td class="color-gray sortable table__cell" (click)="sortBy('updated')">
                  <b>Updated</b> <span><i [ngClass]="getClass('updated')"></i></span>
                </td>
                <td class="color-gray sortable table__cell" (click)="sortBy('created')">
                  <b>Created</b> <span><i [ngClass]="getClass('created')"></i></span>
                </td>
                <td class="color-gray table__action-icons table__centered table__cell"><b>Actions</b></td>
              </tr>
              <tr *ngFor="let workflow of visibleWorkflows; let i = index; trackBy: trackById">
                <td class="table__cell table__centered">
                  <a (click)="goToWorkflowEditor(workflow.id)">{{ i + 1 }}</a>
                </td>
                <td class="table__cell table__left table__truncate">
                  <a [ngClass]="{'owned-by-current-user': isWorkflowOwnedByCurrentUser(workflow)}"
                     [title]="workflow.name" (click)="goToWorkflowEditor(workflow.id)">{{ workflow.name }}</a>
                </td>
                <td class="table__cell table__left table__truncate">
                  <a [ngClass]="{'owned-by-current-user': isWorkflowOwnedByCurrentUser(workflow)}"
                     [title]="workflow.ownerName" (click)="goToWorkflowEditor(workflow.id)">
                    <i class="fa fa-user table__logged-user" *ngIf="isWorkflowOwnedByCurrentUser(workflow)"></i>
                    {{ workflow.ownerName }}</a>
                </td>
                <td class="table__cell table__left table__truncate">
                  <a *ngIf="workflow.description" (click)="goToWorkflowEditor(workflow.id)">
                    <span [title]="workflow.description">{{ workflow.description }}</span>
                  </a>
                  <a *ngIf="!workflow.description || workflow.description.length == 0"
                     (click)="goToWorkflowEditor(workflow.id)">-</a>
                </td>
                <td class="table__cell table__centered">
                  <a (click)="goToWorkflowEditor(workflow.id)">{{ workflow.updated | date:'dd/MM/yyyy - hh:mm a' }}</a>
                </td>
                <td class="table__cell table__centered">
                  <a (click)="goToWorkflowEditor(workflow.id)">{{ workflow.created | date:'dd/MM/yyyy - hh:mm a' }}</a>
                </td>
                <td class="table__cell table__action-icons table__right table__no-wrap">
                  <span>
                    <a *ngIf="workflow.sessionStatus !== 'not_running'" (click)="deleteSession(workflow.id)"
                       title="Stop session"><span class="fa fa-power-off"></span></a>
                    <a title="Clone workflow" (click)="cloneWorkflow(workflow)"><span class="fa fa-files-o"></span></a>
                    <a *ngIf="isWorkflowOwnedByCurrentUser(workflow)" title="Delete workflow"
                       (click)="deleteWorkflow(workflow)"><span class="fa fa-times"></span></a>
                  </span>
                </td>
              </tr>
            </table>
          </div>
          <div class="col-md-12" *ngIf="workflows.length === 0">
            <div class="container center">
              <div class="no-worfklows">
                <div class="no-worfklows__icon">
                  <i class="fa fa-ban"></i><span>No workflows found!</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div *ngIf="isError()" class="col-md-12">
          <div class="container center">
            <div class="no-worfklows">
              <div class="no-worfklows__icon">
                <span><b>6D Analytical Engine is getting ready.</b></span>
                <br/>
                <span>Please wait a few seconds and <a href="#" (click)="reloadPage()">reload the page</a>.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class HomeComponent implements OnInit, DoCheck {
  readonly logo = logo;
  readonly seahorseMain = seahorseMain;

  workflows: any[] = undefined;
  // Bound by *ngFor. Recomputed in ngDoCheck (NOT via a method in the template): Angular runs in dev
  // mode here, and binding *ngFor to a method that returns a fresh _.orderBy array each call throws
  // ExpressionChangedAfterItHasBeenCheckedError on the verification pass. A stored field is stable
  // within a CD cycle.
  visibleWorkflows: any[] = [];
  filterString: string;
  sessionManagerState = 'UNDEFINED';
  loadingWorkflowsState = 'UNDEFINED';
  sort = { column: 'updated', descending: true };

  constructor(
    @Inject('$rootScope') private $rootScope: any,
    private router: Router,
    private modal: ModalService,
    @Inject('ServerCommunication') private serverCommunication: any,
    private workflowService: WorkflowService,
    private userService: UserService,
    private sessionManager: SessionManager,
    private sessionManagerApi: SessionManagerApi,
    private confirmationModalService: ConfirmationModalService,
    private workflowCloneService: WorkflowCloneService
  ) {}

  ngOnInit(): void {
    this.$rootScope.stateData.dataIsLoaded = true;
    this.$rootScope.pageTitle = '6D Analytical Engine';
    this.serverCommunication.unsubscribeFromAllExchanges();
    this.workflows = undefined;
    this.downloadWorkflows();

    (this.sessionManager as any).checkSessionManagerState()
      .then(() => { this.sessionManagerState = 'WORKING'; })
      .catch(() => { this.sessionManagerState = 'NOT_WORKING'; });
  }

  ngDoCheck(): void {
    _.forEach(this.workflows, (w: any) => {
      w.sessionStatus = (this.sessionManager as any).statusForWorkflowId(w.id);
    });
    this.visibleWorkflows = this.getVisibleWorkflows();
  }

  downloadWorkflows = (): void => {
    (this.workflowService as any).downloadWorkflows()
      .then((workflows: any[]) => {
        this.workflows = workflows;
        this.loadingWorkflowsState = 'LOADED';
      })
      .catch(() => { this.loadingWorkflowsState = 'ERROR'; });
  };

  trackById(_index: number, workflow: any): any { return workflow.id; }

  getVisibleWorkflows(): any[] {
    const list = (this.workflows || []).filter((w: any) => this.search(w));
    return _.orderBy(list, [this.sort.column], [this.sort.descending ? 'desc' : 'asc']);
  }

  search(workflow: any): boolean {
    const created = moment(workflow.created).format('DD/MM/YYYY - hh:mm a');
    const updated = moment(workflow.updated).format('DD/MM/YYYY - hh:mm a');
    const f = this.filterString;
    return !f ||
      workflow.name.toLowerCase().includes(f.toLowerCase()) ||
      workflow.description.toLowerCase().includes(f.toLowerCase()) ||
      created.toString().includes(f.toLowerCase()) ||
      updated.toString().includes(f.toLowerCase()) ||
      workflow.ownerName.toLowerCase().includes(f.toLowerCase());
  }

  reloadPage(): void { window.location.reload(); }

  sortBy(columnName: string): void {
    if (this.sort.column === columnName) {
      this.sort.descending = !this.sort.descending;
    } else {
      this.sort.column = columnName;
      this.sort.descending = false;
    }
  }

  isWorkflowOwnedByCurrentUser(workflow: any): boolean {
    return (this.userService as any).getSeahorseUser().id === workflow.ownerId;
  }

  isLoading(): boolean {
    return this.sessionManagerState === 'UNDEFINED' ||
      (this.sessionManagerState === 'WORKING' && this.loadingWorkflowsState === 'UNDEFINED');
  }

  isReady(): boolean {
    return this.sessionManagerState === 'WORKING' && this.loadingWorkflowsState === 'LOADED';
  }

  isError(): boolean {
    return this.sessionManagerState === 'NOT_WORKING' || this.loadingWorkflowsState === 'ERROR';
  }

  getClass(columnName: string): string {
    if (this.sort.column === columnName) {
      const icon = 'glyphicon glyphicon-chevron';
      return this.sort.descending ? icon + '-down' : icon + '-up';
    }
    return '';
  }

  goToWorkflowEditor(workflowId: string): void {
    this.router.navigate(['/workflows', workflowId, 'editor']);
  }

  cloneWorkflow(workflow: any): void {
    (this.workflowCloneService as any).openModal(this.downloadWorkflows, workflow);
  }

  deleteWorkflow(workflow: any): void {
    (this.confirmationModalService as any).showModal({
      message: 'The operation will delete workflow "' + workflow.name +
        '". Deletion cannot be undone afterwards.'
    }).then((confirmed: boolean) => {
      if (!confirmed) { return; }
      (this.workflowService as any).deleteWorkflow(workflow.id);
      (this.sessionManagerApi as any).deleteSessionById(workflow.id);
    });
  }

  deleteSession(workflowId: string): void {
    (this.sessionManagerApi as any).deleteSessionById(workflowId).then(() => {
      this.downloadWorkflows();
    });
  }

  displayCreateWorkflowPopup(event: Event): void {
    event.preventDefault();
    this.modal.open<string>(NewWorkflowModalComponent).result.then((workflowId) => {
      if (workflowId) { this.router.navigate(['/workflows', workflowId, 'editor']); }
    });
  }

  displayUploadWorkflowPopup(event: Event): void {
    event.preventDefault();
    this.modal.open<string>(UploadWorkflowModalComponent).result.then((workflowId) => {
      if (workflowId) { this.router.navigate(['/workflows', workflowId, 'editor']); }
    });
  }
}
