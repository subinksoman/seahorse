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

require('./../deepsense-node-parameters/deepsense-node-parameters.module.js');

// The graph-model objects are now plain ES6 classes (no AngularJS deps). Import them and register
// backward-compat AngularJS factories that return the classes, so still-AngularJS consumers keep
// injecting 'Port'/'Edge'/'GraphNode'/'Workflow' unchanged; ng2 uses the classes via bootstrap.ts.
const Port = require('./deepsense-common-objects/deepsense-common-port.js');
const Edge = require('./deepsense-common-objects/deepsense-common-edge.js');
const GraphNode = require('./deepsense-common-objects/deepsense-common-graph-node.js');
const Workflow = require('./deepsense-common-objects/deepsense-common-workflow.js');

const graphModel = angular.module('deepsense.graph-model', ['deepsense.node-parameters'])
  .factory('Port', () => Port)
  .factory('Edge', () => Edge)
  .factory('GraphNode', () => GraphNode)
  .factory('Workflow', () => Workflow);

module.exports = graphModel;
