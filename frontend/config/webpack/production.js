/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

'use strict';

module.exports = function (_path) {
  return {
    mode: 'production',
    context: _path,
    devtool: 'source-map',
    output: {
      publicPath: '/',
      filename: '[name].[contenthash].js',
      clean: true // webpack 5 native; replaces clean-webpack-plugin
    }
  };
};
