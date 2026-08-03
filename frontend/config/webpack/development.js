/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

'use strict';

// NOTE: the dev server (host/port/proxy to the backend) now lives in global.js so it applies to both
// `npm run serve` (development mode) and `npm run serve:dist` (production mode). Development mode has a
// module-interop quirk with the `angular` default import (`angular.default.module is not a function`)
// that production mode does not — so prefer `npm run serve:dist` for a local run against the backend.
module.exports = function (_path) {
  return {
    mode: 'development',
    context: _path,
    devtool: 'cheap-module-source-map'
  };
};
