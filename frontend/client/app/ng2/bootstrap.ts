import 'reflect-metadata';
import 'zone.js';
import '@angular/compiler'; // JIT compiler (no AoT/ngtsc in this custom webpack build) — must load first
import { NgModule, DoBootstrap } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { UpgradeModule, downgradeInjectable } from '@angular/upgrade/static';
import { HelloAngularService } from './hello.service';
import { UserService } from './user.service';
import { UUIDGenerator } from './uuid-generator.service';
import { TimeService } from './time.service';
import { HelpersService } from './helpers.service';
import { MouseEvent } from './mouse-event.service';
import { EventsService } from './events.service';
import { VersionService } from './version.service';
import { ErrorService } from './error.service';
import { NotificationService } from './notification.service';
import { MultiSelectionService } from './multi-selection.service';
import { BottomBarService } from './bottom-bar.service';
import { DragAndDrop } from './drag-and-drop.service';
import { ConfirmationModalService } from './confirmation-modal.service';
import { ExportModalService } from './export-modal.service';
import { DeleteModalService } from './delete-modal.service';
import { DefaultInnerWorkflowGenerator } from './default-inner-workflow-generator.service';
import { ReportService } from './report.service';
import { ClusterModalService } from './cluster-modal.service';
import { LibraryModalService } from './library-modal.service';
import { OperationsApiClient } from './operations-api-client.service';
import { WorkflowsApiClient } from './workflows-api-client.service';
import { SessionManagerApi } from './session-manager-api.service';
import { OperationsHierarchyService } from './operations-hierarchy.service';
import { WorkflowCloneService } from './workflow-clone.service';
import { OperationsService } from './operations.service';
import { SessionManager } from './session-manager.service';
import { WorkflowService } from './workflow.service';
import { upgradedProviders } from './upgraded-providers';

declare const angular: any;

// Expose Angular services to AngularJS DI (the two frameworks share one injector tree). Each
// downgraded service replaces its legacy AngularJS registration; consumers are unchanged.
angular.module('ds.lab')
  .factory('helloAngular', downgradeInjectable(HelloAngularService) as any)
  .factory('UserService', downgradeInjectable(UserService) as any) // Phase C-1: migrated to Angular 18
  .factory('UUIDGenerator', downgradeInjectable(UUIDGenerator) as any) // Phase C-1: migrated to Angular 18
  .factory('TimeService', downgradeInjectable(TimeService) as any) // Phase C-1: migrated to Angular 18
  .factory('HelpersService', downgradeInjectable(HelpersService) as any) // Phase C-1: migrated to Angular 18
  .factory('MouseEvent', downgradeInjectable(MouseEvent) as any) // Phase C-1: migrated to Angular 18
  .factory('EventsService', downgradeInjectable(EventsService) as any) // Phase C-1: migrated to Angular 18
  .factory('version', downgradeInjectable(VersionService) as any) // Phase C-1: migrated to Angular 18
  .factory('ErrorService', downgradeInjectable(ErrorService) as any) // Phase C-1: migrated to Angular 18
  .factory('NotificationService', downgradeInjectable(NotificationService) as any) // Phase C-1: migrated to Angular 18
  .factory('MultiSelectionService', downgradeInjectable(MultiSelectionService) as any) // Phase C-1: migrated to Angular 18
  .factory('BottomBarService', downgradeInjectable(BottomBarService) as any) // Phase C-1: migrated to Angular 18
  .factory('DragAndDrop', downgradeInjectable(DragAndDrop) as any) // Phase C-1: migrated to Angular 18
  .factory('ConfirmationModalService', downgradeInjectable(ConfirmationModalService) as any) // Phase C-1: migrated to Angular 18
  .factory('ExportModalService', downgradeInjectable(ExportModalService) as any) // Phase C-1: migrated to Angular 18
  .factory('DeleteModalService', downgradeInjectable(DeleteModalService) as any) // Phase C-1: migrated to Angular 18
  .factory('DefaultInnerWorkflowGenerator', downgradeInjectable(DefaultInnerWorkflowGenerator) as any) // Phase C-1: migrated to Angular 18
  .factory('Report', downgradeInjectable(ReportService) as any) // Phase C-1: migrated to Angular 18
  .factory('ClusterModalService', downgradeInjectable(ClusterModalService) as any) // Phase C-1: migrated to Angular 18
  .factory('LibraryModalService', downgradeInjectable(LibraryModalService) as any) // Phase C-1: migrated to Angular 18
  .factory('OperationsApiClient', downgradeInjectable(OperationsApiClient) as any) // Phase C-1: migrated to Angular 18
  .factory('WorkflowsApiClient', downgradeInjectable(WorkflowsApiClient) as any) // Phase C-1: migrated to Angular 18
  .factory('SessionManagerApi', downgradeInjectable(SessionManagerApi) as any) // Phase C-1: migrated to Angular 18
  .factory('OperationsHierarchyService', downgradeInjectable(OperationsHierarchyService) as any) // Phase C-1: migrated to Angular 18
  .factory('WorkflowCloneService', downgradeInjectable(WorkflowCloneService) as any) // Phase C-1: migrated to Angular 18
  .factory('Operations', downgradeInjectable(OperationsService) as any) // Phase C-1: migrated to Angular 18
  .factory('SessionManager', downgradeInjectable(SessionManager) as any) // Phase C-1: migrated to Angular 18
  .factory('WorkflowService', downgradeInjectable(WorkflowService) as any); // Phase C-1: migrated to Angular 18 (the central editor hub)

@NgModule({
  imports: [BrowserModule, UpgradeModule],
  // Bridge AngularJS core (e.g. $rootScope) and constants (config) into the Angular injector so
  // migrated services can inject them by string token. See upgraded-providers.ts.
  providers: [...upgradedProviders]
})
export class AppModule implements DoBootstrap {
  constructor(private upgrade: UpgradeModule) {}
  ngDoBootstrap(): void {
    // Bootstrap the existing AngularJS app under Angular's control (strict DI preserved).
    this.upgrade.bootstrap(document.documentElement, ['ds.lab'], { strictDi: true });
    // eslint-disable-next-line no-console
    console.log('[hybrid] Angular', '18', 'bootstrapped ds.lab; helloAngular =', (angular.element(document.documentElement).injector() ? 'wired' : '?'));
  }
}

platformBrowserDynamic().bootstrapModule(AppModule).catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[hybrid] bootstrap failed', err);
});
