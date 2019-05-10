var chokidar = require('chokidar')
var debug = require('debug')
var express = require('express')
var fse = require('fs-extra')
var glob = require('glob')
var minimatch = require('minimatch')
var yargs = require('yargs')

var acorn = require('acorn')
var estreeWalker = require('estree-walker')
var MagicString = require('magic-string')

// lodash
var forEach = require('lodash/forEach')
var isArray = require('lodash/isArray')
var isString = require('lodash/isString')
var isFunction = require('lodash/isFunction')
var isPlainObject = require('lodash/isPlainObject')
var uniq = require('lodash/uniq')
var without = require('lodash/without')
var clone = require('lodash/clone')

// postcss
var postcss = require('postcss')
var postcssImport = require('postcss-import/index.js')
var postcssVariables = require('postcss-css-variables')
var postcssReporter = require('postcss-reporter')

var colors = require('colors/safe')

module.exports = {
  chokidar: chokidar,
  debug: debug,
  express: express,
  fse: fse,
  glob: glob,
  minimatch: minimatch,
  acorn: acorn,
  estreeWalker: estreeWalker,
  MagicString: MagicString,
  forEach: forEach,
  isArray: isArray,
  isString: isString,
  isFunction: isFunction,
  isPlainObject: isPlainObject,
  uniq: uniq,
  without: without,
  clone: clone,
  commonjs: commonjs,
  alias: alias,
  sourcemaps: sourcemaps,
  buble: buble,
  pluginutils: pluginutils,
  yargs: yargs,
  postcss: postcss,
  postcssImport: postcssImport,
  postcssVariables: postcssVariables,
  postcssReporter: postcssReporter,
  colors: colors
}
