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
var sourcemaps = require('rollup-plugin-sourcemaps')
var buble = require('../vendor/buble.deps')
var pluginutils = require('rollup-pluginutils/dist/pluginutils.cjs.js')

// postcss
var postcss = require('postcss')
var postcssImport = require('postcss-import')
var postcssVariables = require('postcss-css-variables')

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
  sourcemaps: sourcemaps,
  buble: buble,
  pluginutils: pluginutils,
  yargs: yargs,
  postcss: postcss,
  postcssImport: postcssImport,
  postcssVariables: postcssVariables
}
