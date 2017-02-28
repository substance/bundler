import { isAbsolute } from '../fileUtils'
import { minimatch } from '../vendor'
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
  const ignore = (opts.ignore || []).map((pattern) => {
    // is glob pattern?
    if (pattern.indexOf('*') > -1) {
      return (f) => {
        let result = minimatch(f, pattern) || minimatch(path.basename(f), pattern)
        // console.log('#### %s?', pattern, f, result)
        return result
      }
    } else {
      return f => f === pattern
    }
  })
  const cjs = {}
  if (opts.cjs) {
    opts.cjs.forEach(function(m) {
      cjs[m] = true
    })
  }
  return {
    name: "resolve",
    resolveId: function(importee, importer) {
      // 'claim' loading
      // TODO: really?
      if (importee === EMPTY_ID) return EMPTY_ID
      // ignore IDs with null character, these belong to other plugins
      if (/\0/.test(importee)) return null
      // disregard entry module
      if (!importer) return null
      // this is fishy
      if (!isAbsolute(importer)) {
        // TODO: why is that so?
        // happens for instance with commonjs proxies
        // console.warn('FIXME: resolve-plugin.resolveId(%s, %s)', importee, importer)
        return null
      }

      if (ignore.length > 0) {
        for (let i = 0; i < ignore.length; i++) {
          if (ignore[i](importee)) {
            return EMPTY_ID
          }
        }
      }
      // if (ignore.indexOf(importee) > -1) {
      //   // console.log('## ignoring %s', importee)
      //   return EMPTY_ID
      // }
      // process relative imports
      if (importee.charCodeAt(0) === DOT) {
        try {
          // console.log('.... resolving relatively: %s from %s', importee, importer)
          let p = require.resolve(path.join(path.dirname(importer), importee))
          return _withExtension(p)
        } catch (err) {
          return null
        }
      }
      if (alias[importee]) {
        // console.log('.... using alias: %s -> %s', importee, alias[importee])
        importee = alias[importee]
      }
      // console.log('## resolving %s from %s', importee, importer)
      let dirname = path.dirname(importer)
      let paths = Module._nodeModulePaths(dirname)
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
            // console.log('.... resolved via package jsnext:main', p)
            return _withExtension(p)
          }
        }
      }
      let p = Module._findPath(importee, paths, false) || null
      if (p) {
        // console.log('.... resolved', p)
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
