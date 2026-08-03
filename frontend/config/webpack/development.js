/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

'use strict';

module.exports = function (_path) {
  return {
    mode: 'development',
    context: _path,
    devtool: 'cheap-module-source-map',
    devServer: {
      static: { directory: _path + '/dist' },
      hot: true,
      port: 3000
    }
  };
};
