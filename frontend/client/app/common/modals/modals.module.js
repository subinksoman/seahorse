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

exports.inject = function(module) {
  // ALL modal controllers (confirmation/delete/export/workflow-clone/new-workflow/upload-workflow) are
  // folded into their Angular callers/services via the child-scope trick — no AngularJS controller
  // registration remains. The modal templates + uib-modal itself stay AngularJS until the
  // ui.bootstrap -> Bootstrap 5 step. (new-workflow + upload-workflow are opened from HomeComponent;
  // upload uses the bridged ngFileUpload 'Upload'.)
};
