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

var angular = require('angular');

var reports = angular.module('ds.reports', []);

require('./reports.controller.js').inject(reports);
// reports.factory migrated to Angular 18 (ng2/report.service.ts) — downgraded as 'Report'.
require('./report.directive.js').inject(reports);

// report-dataframe-full migrated to Angular (app/ng2/report-dataframe-full.component.ts).
// report-default migrated to Angular (app/ng2/report-default.component.ts).
// report-table migrated to Angular (app/ng2/report-table.component.ts) — downgraded as directive 'reportTable'.
require('./report-table/cell-viewer/cell-viewer-modal.ctrl.js').inject(reports);

require('./charts/distribution-categorical-chart.js').inject(reports);
require('./charts/distribution-continuous-chart.js').inject(reports);

require('./charts/box-plot.js').inject(reports);
require('./charts/column-plot.js').inject(reports);
require('./charts/pie-plot.js').inject(reports);
require('./charts/basic-line-plot.js').inject(reports);

module.exports = reports;
