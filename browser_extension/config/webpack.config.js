'use strict';

const { merge } = require('webpack-merge');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const common = require('./webpack.common.js');
const PATHS = require('./paths');

// Merge webpack configuration files
const config = (env, argv) =>
  merge(common, {
    entry: {
      popup: PATHS.src + '/popup.ts',
      background: PATHS.src + '/background.ts',
      stats: PATHS.src + '/stats/stats.js',
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: PATHS.src + '/stats/stats.html',
        filename: 'stats.html',
        chunks: ['stats'],
      }),
    ],
    devtool: argv.mode === 'production' ? false : 'source-map',
  });

module.exports = config;
