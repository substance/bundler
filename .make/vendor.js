var chokidar = require('chokidar')
var debug = require('debug')
var express = require('express')
var fse = require('fs-extra')
var glob = require('glob')
var yargs = require('yargs')

//lodash
var forEach = require('lodash/forEach')
var isArray = require('lodash/isArray')
var isString = require('lodash/isString')
var isFunction = require('lodash/isFunction')
var uniq = require('lodash/uniq')
var without = require('lodash/without')

//rollup
var rollup = require('rollup/dist/rollup')
var buble = require('rollup-plugin-buble')
var commonjs = require('rollup-plugin-commonjs')
var sourcemaps = require('rollup-plugin-sourcemaps')

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
  uniq: uniq,
  without: without,
  rollup: rollup,
  buble: buble,
  commonjs: commonjs,
  sourcemaps: sourcemaps,
  yargs: yargs
}
