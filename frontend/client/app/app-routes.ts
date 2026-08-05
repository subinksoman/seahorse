/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Routes } from '@angular/router';
import { HomeComponent } from './components/home.component';
import { WorkflowsShellComponent } from './components/router-shell.component';
import { WorkflowsEditorComponent } from './components/workflows-editor.component';
import { ErrorViewComponent } from './components/error-view.component';
import { workflowResolver } from './core/workflow.resolver';

// Phase C / router inversion: the @angular/router route table, replacing the 4 ui-router $stateProvider
// configs (home / workflows / workflows.editor / errors). useHash keeps the existing #/… URLs; the
// nested 'workflows' > ':id/editor' mirrors the old parent/child states (shell header + editor outlet).
export const appRoutes: Routes = [
  { path: '', pathMatch: 'full', component: HomeComponent },
  {
    path: 'workflows',
    component: WorkflowsShellComponent,
    children: [
      { path: ':id/editor', component: WorkflowsEditorComponent, resolve: { workflow: workflowResolver } }
    ]
  },
  { path: 'error/missing', component: ErrorViewComponent, data: { mode: 'missing' } },
  { path: 'error/request-timeout', component: ErrorViewComponent, data: { mode: 'timeout' } },
  { path: ':type/error/version/:id', component: ErrorViewComponent, data: { mode: 'version' } },
  { path: '**', redirectTo: '' }
];
