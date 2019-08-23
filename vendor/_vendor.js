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
var postcssReporter = require('postcss-reporter')

var colors = require('colors/safe')

module.exports = {
  chokidar,
  debug,
  express,
  fse,
  glob,
  minimatch,
  acorn,
  estreeWalker,
  MagicString,
  forEach,
  isArray,
  isString,
  isFunction,
  isPlainObject,
  uniq,
  without,
  clone,
  yargs,
  postcss,
  postcssImport,
  postcssReporter,
  colors
}
