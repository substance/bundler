import { isAbsolute } from '../fileUtils'
import { minimatch, debug as _debug, colors } from '../vendor'

const debug = _debug('bundler:rollup:resolve')

const Module = require('module')
const path = require('path')
const fs = require('fs')

const EMPTY_ID = "\0resolve:empty.js"
const EMPTY_CODE = "export default {}"
const DOT = '.'.charCodeAt(0)

// rather dangerous iplementation of nodejs resolve
// using node's private API
export default function resolve(opts) {
  opts = opts || {}
  const alias = opts.alias || {}
  if (opts.alias) {
    debug('Using aliases: %s', JSON.stringify(opts.alias, 0, 2))
  }
  const ignore = (opts.ignore || []).map((pattern) => {
    // is glob pattern?
    if (pattern.indexOf('*') > -1) {
      return (f) => {
        let result = minimatch(f, pattern) || minimatch(path.basename(f), pattern)
        // TODO: improve debug msg
        // debug('#### %s?', pattern, f, result)
        return result
      }
    } else {
      return f => f === pattern
    }
  })
  const external = (opts.external||[]).reduce((m,e)=>{m[e]=true;return m}, {})
  const cjs = {}
  if (opts.cjs) {
    opts.cjs.forEach(function(m) {
      cjs[m] = true
    })
  }
  return {
    name: "resolve",
    resolveId: function resolveId(importee, importer) {
      const DEBUG = debug.enabled
      // const DEBUG = importee.indexOf('domutils') >= 0
      if (DEBUG) debug('resolving %s from %s', importee, importer)

      if (importee === EMPTY_ID) return EMPTY_ID
      // ignore IDs with null character, these belong to other plugins
      if (/\0/.test(importee)) return null
      // skip entry module
      if (!importer) return null

      if (!isAbsolute(importer)) {
        // TODO: why is that so?
        // happens for instance with commonjs proxies
        // console.warn('FIXME: resolve-plugin.resolveId(%s, %s)', importee, importer)
        return null
      }
      if (external[importee]) {
        return null
      }
      // stub out ignored modules
      if (ignore.length > 0) {
        for (let i = 0; i < ignore.length; i++) {
          if (ignore[i](importee)) {
            return EMPTY_ID
          }
        }
      }
      // Note about aliases:
      // This is a custom feature of our
      // rollup resolve plugin, that allows us
      // to redirect certain imports to other
      // files on the disk. E.g. this is important
      // in a mixed CommonJS and ES6 scenario,
      // where it can be easier to use browserify
      // to bundle subtrees, and let rollup do the rest.

      // process relative imports
      if (importee.charCodeAt(0) === DOT) {
        if (DEBUG) debug('.. resolving relatively: %s from %s', importee, importer)
        // first try with extension added
        let _importee = path.join(path.dirname(importer), _withExtension(importee))
        // redirecting if there is an alias
        if (alias[_importee]) {
          if (DEBUG) debug('.. '+colors.green('using ALIAS')+': %s -> %s', _importee, alias[_importee])
          return resolveId(alias[_importee], importer)
        }
        try {
          if (DEBUG) debug('.. trying: %s', _importee)
          let p = require.resolve(_importee)
          if (DEBUG) debug('.. found', p)
          return _withExtension(p)
        } catch (err) { /* nothing */ }
        // then try as it is written originally
        _importee = path.join(path.dirname(importer), importee)
        // redirecting if there is an alias
        if (alias[_importee]) {
          if (DEBUG) debug('.. '+colors.green('using ALIAS')+': %s -> %s', _importee, alias[_importee])
          return resolveId(alias[_importee], importer)
        }
        try {
          if (DEBUG) debug('.. trying: %s', _importee)
          let p = require.resolve(_importee)
          if (DEBUG) debug('.. found', p)
          return _withExtension(p)
        } catch (err) { /* nothing */ }
        // finally try index.js
        _importee = path.join(path.dirname(importer), importee, 'index.js')
        // redirecting if there is an alias
        if (alias[_importee]) {
          if (DEBUG) debug('.. '+colors.green('using ALIAS')+': %s -> %s', _importee, alias[_importee])
          return resolveId(alias[_importee], importer)
        }
        try {
          if (DEBUG) debug('.. trying: %s', _importee)
          let p = require.resolve(_importee)
          if (DEBUG) debug('.. found', p)
          return _withExtension(p)
        } catch (err) { /* nothing */ }
        // if non of the above works, return null which means a failed lookup
        if (DEBUG) debug('.. not found')
        return null
      }

      // aliases for module imports or absolute file paths
      if (alias[importee]) {
        if (DEBUG) debug('.. '+colors.green('using ALIAS')+': %s -> %s', importee, alias[importee])
        importee = alias[importee]
      }

      let dirname = path.dirname(importer)
      let paths = Module._nodeModulePaths(dirname)
      // try to find it first before doing something special
      if (DEBUG) debug('.. trying _findPath')
      // then try to look for a node_module
      // NOTE: jsnext:main is now the default for modules
      // if you want to support legacy modules you need to provide an array of cjs modules
      // via opts.cjs
      let isModule = importee.indexOf('/') === -1
      if (isModule && !cjs[importee]) {
        let pkgPath = importee+"/package.json"
        let pkgPathAbs = Module._findPath(pkgPath, paths, false)
        if (pkgPathAbs) {
          let pkg = JSON.parse(fs.readFileSync(pkgPathAbs, 'utf8'))
          let entry = pkg['jsnext:main']
          if (entry) {
            let p = path.join(path.dirname(pkgPathAbs), entry)
            if (DEBUG) debug('.. found via package jsnext:main: %s', p)
            return _withExtension(p)
          }
        }
      }
      let p = Module._findPath(importee, paths, false) || null
      if (p) {
        if (DEBUG) debug('.. found: %s', p)
        return _withExtension(p)
      }
    },
    load: function(id) {
      if (id === EMPTY_ID) {
        return EMPTY_CODE
      }
    }
  }
}

function _withExtension(p) {
  if (p) {
    let ext = path.extname(p)
    if (!ext) p = p + '.js'
  }
  return p
}
