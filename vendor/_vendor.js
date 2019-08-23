const chokidar = require('chokidar')
const debug = require('debug')
const express = require('express')
const fse = require('fs-extra')
const glob = require('glob')
const minimatch = require('minimatch')
const yargs = require('yargs')

// lodash
const forEach = require('lodash/forEach')
const isArray = require('lodash/isArray')
const isString = require('lodash/isString')
const isFunction = require('lodash/isFunction')
const isPlainObject = require('lodash/isPlainObject')
const omit = require('lodash/omit')
const uniq = require('lodash/uniq')
const without = require('lodash/without')
const clone = require('lodash/clone')

// postcss
const postcss = require('postcss')
const postcssImport = require('postcss-import/index.js')
const postcssReporter = require('postcss-reporter')

const colors = require('colors/safe')

module.exports = {
  chokidar,
  debug,
  express,
  fse,
  glob,
  minimatch,
  forEach,
  isArray,
  isString,
  isFunction,
  isPlainObject,
  omit,
  uniq,
  without,
  clone,
  yargs,
  postcss,
  postcssImport,
  postcssReporter,
  colors
}
