/**
 * Copyright 2017 deepsense.ai (CodiLime, Inc)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

// workflows-editor.html + WorkflowsEditorController migrated to Angular (ng2/workflows-editor
// .component.ts) — downgraded 'workflowsEditor'. The state now renders <workflows-editor>; the resolve
// (below) stashes the downloaded workflow on $rootScope._workflowWithResults for the component's
// ngOnInit (preserving the async gate — the component renders only after the resolve completes).

/* @ngInject */
function WorkflowsConfig($stateProvider) {

  $stateProvider.state('workflows.editor', {
    url: '/:id/editor',
    template: '<workflows-editor></workflows-editor>',
    resolve: {
      workflowWithResults: /* @ngInject */ ($q, $rootScope, $stateParams, $state, NotificationService,
        WorkflowService, Operations, OperationsHierarchyService, ServerCommunication, UserService) => {
        return $q.all([
            WorkflowService.downloadWorkflow($stateParams.id),
            Operations.load().then(OperationsHierarchyService.load)
          ])
          .then(([workflow, ..._]) => {
            const workflowOwnedByCurrentUser = UserService.getSeahorseUser().id === workflow.workflowInfo.ownerId;
            if (workflowOwnedByCurrentUser) {
              /* eslint-disable no-console */
              /* eslint-enable no-console */
              ServerCommunication.init(workflow.id);
            }
            $rootScope.stateData.dataIsLoaded = true;
            $rootScope._workflowWithResults = workflow;
            return workflow;
          })
          .catch((error) => {
            /* eslint-disable no-console */
            console.error(`Problem with opening workflow ${$stateParams.id}`, error);
            /* eslint-enable no-console */
            $state.go('home', {}, {reload: true});
            NotificationService.showError({
              title: 'Problem with opening workflow',
              message: `Problem occured while opening workflow with id ${$stateParams.id}`
            });
          });
      }
    }
  });

}

exports.function = WorkflowsConfig;

exports.inject = function(module) {
  module.config(WorkflowsConfig);
};
