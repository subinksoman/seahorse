/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

'use strict';

const path = require('path');
const webpack = require('webpack');

// Reuse the production resolve/module rules (aliases, babel + ng-annotate, less/css, assets)
// but strip entries/output/optimization/HtmlWebpackPlugin — karma-webpack bundles each spec.
const _path = path.join(__dirname, '..', '..');
const globalConfig = require('./global.js')(_path);

module.exports = {
  mode: 'development',
  devtool: 'inline-source-map',
  resolve: globalConfig.resolve,
  module: globalConfig.module,
  plugins: [
    new webpack.ProvidePlugin({ $: 'jquery', jQuery: 'jquery' }),
    new webpack.DefinePlugin({
      NODE_ENV: JSON.stringify('test'),
      'process.env.NODE_ENV': JSON.stringify('test')
    })
  ],
  stats: 'errors-only',
  watch: false
};
