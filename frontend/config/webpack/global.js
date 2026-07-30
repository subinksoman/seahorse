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

const path = require('path');
const webpack = require('webpack');
const autoprefixer = require('autoprefixer-core');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const GitRevisionPlugin = require('git-revision-webpack-plugin');

const NODE_ENV = process.env.NODE_ENV || 'production';

module.exports = function (_path) {
  const webpackConfig = {
    entry: {
      libs: _path + '/client/app/libs.js', // TODO: remove
      app: _path + '/client/app/app.js',
      ga: _path + '/client/app/app.ga.js'
    },

    output: {
      // webpack 2 requires an absolute output path.
      path: path.join(_path, 'dist'),
      filename: '[name].js',
      publicPath: '/'
    },

    // resolves modules
    resolve: {
      // webpack 2 no longer accepts the leading empty string in `extensions`.
      extensions: ['.js'],
      // `modulesDirectories` was renamed to `modules` in webpack 2.
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
      }
    },

    // webpack 2 removed automatic '-loader' suffixing, but the client source still
    // uses bare inline loader references (e.g. require('imports?...!script!...')).
    // Restore the suffix resolution rather than rewriting every inline require.
    resolveLoader: {
      moduleExtensions: ['-loader']
    },

    module: {
      // webpack 2 merged preLoaders/loaders/postLoaders into a single `rules`
      // array; `enforce: 'pre'` replaces the old preLoaders bucket.
      rules: [{
        enforce: 'pre',
        test: /\.js$/,
        loader: 'eslint-loader',
        exclude: [
          /node_modules/,
          /vendor/
        ],
        options: {
          configFile: path.join(_path, 'config', 'eslint', 'eslint-src.config.js'),
          // This is a legacy (Angular 1.5) codebase; surface lint issues as
          // warnings so they don't fail the production bundle.
          emitWarning: true,
          failOnError: false
        }
      }, {
        test: /\.json$/,
        loader: 'json-loader'
      }, {
        test: /\.html$/,
        // webpack 2 requires the full `-loader` names and uses `use` for chains.
        use: [
          'ngtemplate-loader?relativeTo=' + _path,
          'html-loader?-minimize'
        ]
      }, {
        test: /\.css$/,
        use: ['style-loader', 'css-loader', 'postcss-loader']
      }, {
        test: /\.less/,
        use: ['style-loader', 'css-loader', 'postcss-loader', 'less-loader']
      }, {
        test: /\.(png|jpg|gif)$/,
        loader: 'url-loader?limit=8192'
      }, {
        test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/,
        loader: 'url-loader?limit=10000&mimetype=application/font-woff'
      }, {
        test: /\.(ttf|eot|svg)(\?v=[0-9]\.[0-9]\.[0-9])?$/,
        loader: 'url-loader'
      }, {
        test: /\.js$/,
        exclude: [
          path.resolve(_path, 'node_modules')
        ],
        use: [
          'ng-annotate-loader'
        ]
      }, {
        test: /\.js$/,
        loader: 'babel-loader',
        exclude: [
          path.resolve(_path, 'node_modules')
        ],
        // `query` -> `options` in webpack 2.
        options: {
          cacheDirectory: true,
          plugins: [
            'transform-runtime',
            'add-module-exports'
          ]
        }
      }, {
        test: require.resolve('angular'),
        use: ['expose-loader?angular']
      }, {
        test: require.resolve('jquery'),
        use: ['expose-loader?$', 'expose-loader?jQuery']
      }]
    },

    // For SockJs
    node: {
      net: 'empty',
      tls: 'empty',
      dns: 'empty'
    },

    plugins: [
      // webpack 2 removed top-level loader config keys (postcss/eslint); pass
      // them to the loaders through LoaderOptionsPlugin instead.
      new webpack.LoaderOptionsPlugin({
        options: {
          context: _path,
          postcss: [autoprefixer({browsers: ['last 5 versions']})]
        }
      }),
      // new webpack.ContextReplacementPlugin(/moment[\/\\]locale$/, /en|hu/),
      new webpack.ProvidePlugin({
        $: 'jquery',
        jQuery: 'jquery'
      }),
      new webpack.DefinePlugin({
        'NODE_ENV': JSON.stringify(NODE_ENV)
      }),
      // NoErrorsPlugin was renamed to NoEmitOnErrorsPlugin; DedupePlugin was
      // removed (deduplication is automatic in webpack 2).
      new webpack.NoEmitOnErrorsPlugin(),
      new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/),
      new webpack.optimize.AggressiveMergingPlugin({
        moveToParents: true
      }),
      new webpack.optimize.CommonsChunkPlugin({
        name: 'common',
        minChunks: 2
      }),
      new HtmlWebpackPlugin({
        favicon: path.join(_path, 'client', 'favicon.ico'),
        filename: 'index.html',
        template: path.join(_path, 'client', 'index.html'),
        gitHash: JSON.stringify(new GitRevisionPlugin().commithash())
      })
    ]
  };

  return webpackConfig;
};
