// chokidar
var chokidar = require('chokidar')
// express
var express = require('express')
// fs-extra
var fse = require('fs-extra')
var glob = require('glob')
// lodash
var forEach = require('lodash/forEach')
var isArray = require('lodash/isArray')
var isFunction = require('lodash/isFunction')
// rollup
var rollup = require('rollup/dist/rollup')
var buble = require('rollup-plugin-buble')
var commonjs = require('rollup-plugin-commonjs')
var sourcemaps = require('rollup-plugin-sourcemaps')
// uglify-js
var uglify = require('uglify-js')
// yargs
var yargs = require('yargs')

module.exports = {
  chokidar: chokidar,
  express: express,
  removeSync: fse.removeSync,
  walk: fse.walk,
  copySync: fse.copySync,
  ensureDirSync: fse.ensureDirSync,
  glob: glob,
  forEach: forEach,
  isArray: isArray,
  isFunction: isFunction,
  rollup: rollup,
  buble: buble,
  commonjs: commonjs,
  sourcemaps: sourcemaps,
  uglify: uglify,
  yargs: yargs
}
