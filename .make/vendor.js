var chokidar = require('chokidar')
var debug = require('debug')
var express = require('express')
var fse = require('fs-extra')
var glob = require('glob')
var yargs = require('yargs')

// lodash
var forEach = require('lodash/forEach')
var isArray = require('lodash/isArray')
var isString = require('lodash/isString')
var isFunction = require('lodash/isFunction')
var isPlainObject = require('lodash/isPlainObject')
var uniq = require('lodash/uniq')
var without = require('lodash/without')

// rollup
var rollup = require('rollup/dist/rollup')
var commonjs = require('rollup-plugin-commonjs')
// ATTENTION: rollup-plugin-node-resolve can not be bundler due to dynamic require statement
// We use a patched version instead
//var nodeResolve = require('rollup-plugin-node-resolve')
var json = require('rollup-plugin-json')
var sourcemaps = require('rollup-plugin-sourcemaps')
var buble = require('../tmp/buble.deps')
var pluginutils = require('rollup-pluginutils/dist/pluginutils.cjs.js')

// postcss
var postcss = require('postcss')
var postcssImport = require('postcss-import')
var postcssVariables = require('postcss-css-variables')

var colors = require('colors/safe')

module.exports = {
  chokidar: chokidar,
  debug: debug,
  express: express,
  fse: fse,
  glob: glob,
  forEach: forEach,
  isArray: isArray,
  isString: isString,
  isFunction: isFunction,
  isPlainObject: isPlainObject,
  uniq: uniq,
  without: without,
  rollup: rollup,
  commonjs: commonjs,
  json: json,
  sourcemaps: sourcemaps,
  buble: buble,
  pluginutils: pluginutils,
  yargs: yargs,
  postcss: postcss,
  postcssImport: postcssImport,
  postcssVariables: postcssVariables,
  colors: colors
}
