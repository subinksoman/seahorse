/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Directive, ElementRef, Injector, Input } from '@angular/core';
import { UpgradeComponent } from '@angular/upgrade/static';

// Phase C / editor-shell island: the workflow-schedules subsystem (components/schedules/) is large
// (workflow-schedules + schedule + edit-schedule + service + scheduling-manager-api) and stays
// AngularJS for now. To let the migrated Angular <workflows-editor> shell host it, we UPGRADE the
// AngularJS 'workflowSchedules' component into Angular via UpgradeComponent (the reverse of
// downgradeComponent). The AngularJS component keeps running with its AngularJS deps; Angular just
// projects it. Its one binding (workflow: '<') is mirrored as an @Input. Migrate the subsystem to
// native Angular later to finally drop this wrapper.
@Directive({ standalone: false, selector: 'workflow-schedules' })
export class WorkflowSchedulesUpgradeDirective extends UpgradeComponent {
  @Input() workflow: any;

  constructor(elementRef: ElementRef, injector: Injector) {
    super('workflowSchedules', elementRef, injector);
  }
}
