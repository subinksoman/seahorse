/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

'use strict';

const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const NODE_ENV = process.env.NODE_ENV || 'production';

module.exports = function (_path) {
  return {
    entry: {
      libs: _path + '/client/app/libs.js', // vendor libs; registers AngularJS plugins on the shared angular
      app: _path + '/client/app/app.js',
      ga: _path + '/client/app/app.ga.js'
    },

    output: {
      path: path.join(_path, 'dist'),
      filename: '[name].js',
      publicPath: '/'
    },

    resolve: {
      extensions: ['.js'],
      modules: [path.join(_path, 'node_modules'), 'node_modules'],
      alias: {
        APP: path.join(_path, 'client', 'app'),
        ASSETS: path.join(_path, 'client', 'assets'),
        COMMON: path.join(_path, 'client', 'common'),
        COMPONENTS: path.join(_path, 'client', 'components'),
        LESS: path.join(_path, 'client', 'less'),
        NODE_MODULES: path.join(_path, 'node_modules'),
        SRC: path.join(_path, 'client'),
        STATIC: path.join(_path, 'client', 'static'),
        VENDOR: path.join(_path, 'vendor'),
        _styles: path.join(_path, 'client', 'css')
      },
      // webpack 5 removed automatic Node core-module polyfills; stub the ones sockjs/etc. touch.
      fallback: { net: false, tls: false, dns: false }
    },

    module: {
      rules: [
        {
          test: /\.html$/,
          exclude: path.join(_path, 'client', 'index.html'), // the HtmlWebpackPlugin template
          use: [
            { loader: 'ngtemplate-loader', options: { relativeTo: _path } },
            // sources:true (default) rewrites static <img src>/<link href> in templates to
            // webpack asset URLs (the logo/cluster icons); dynamic ng-src bindings are left alone.
            { loader: 'html-loader', options: { minimize: false, esModule: false } }
          ]
        },
        { test: /\.css$/, use: ['style-loader', 'css-loader', 'postcss-loader'] },
        {
          test: /\.less$/,
          use: [
            'style-loader',
            'css-loader',
            'postcss-loader',
            // less 4 disabled inline JavaScript (backtick expressions) by default; the legacy
            // .define-font-face mixin relies on it.
            { loader: 'less-loader', options: { lessOptions: { javascriptEnabled: true } } }
          ]
        },
        { test: /\.(png|jpg|gif)$/, type: 'asset', parser: { dataUrlCondition: { maxSize: 8192 } } },
        {
          test: /\.(woff2?|ttf|eot|svg)(\?v=[0-9]\.[0-9]\.[0-9])?$/,
          type: 'asset',
          parser: { dataUrlCondition: { maxSize: 10000 } }
        },
        {
          test: /\.js$/,
          // vendor/ holds legacy jQuery plugins (jqCron) that rely on `this === window` and
          // script-loader-style global execution; transpiling them breaks that, so skip them.
          exclude: [/node_modules/, /[\\/]vendor[\\/]/],
          // ng-annotate-loader runs AFTER babel (loaders execute right-to-left) on the
          // transpiled ES5, where ng-annotate's dataflow correctly injects $inject for
          // controllers nested in object literals (the .component({controller: class}) pattern
          // that babel-plugin-angularjs-annotate could not annotate) — required under ng-strict-di.
          use: [
            'ng-annotate-loader',
            { loader: 'babel-loader', options: { cacheDirectory: true } }
          ]
        },
        // Expose the single shared angular/jquery instances as globals for legacy code + plugins.
        { test: require.resolve('angular'), loader: 'expose-loader', options: { exposes: 'angular' } },
        { test: require.resolve('jquery'), loader: 'expose-loader', options: { exposes: ['$', 'jQuery'] } }
      ]
    },

    optimization: {
      runtimeChunk: 'single',
      // Extract modules shared across entries (notably angular) into one `common` chunk so there
      // is a single angular instance, loaded once before libs/app which register on it.
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          common: { name: 'common', minChunks: 2, priority: 10, reuseExistingChunk: true, enforce: true }
        }
      }
    },

    plugins: [
      new webpack.ProvidePlugin({ $: 'jquery', jQuery: 'jquery' }),
      new webpack.DefinePlugin({
        NODE_ENV: JSON.stringify(NODE_ENV),
        'process.env.NODE_ENV': JSON.stringify(NODE_ENV)
      }),
      new webpack.IgnorePlugin({ resourceRegExp: /^\.\/locale$/, contextRegExp: /moment$/ }),
      new HtmlWebpackPlugin({
        favicon: path.join(_path, 'client', 'favicon.ico'),
        filename: 'index.html',
        template: path.join(_path, 'client', 'index.html'),
        inject: 'body'
      })
    ]
  };
};
