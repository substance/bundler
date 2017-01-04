var Module = require('module')
var path = require('path')
var DOT = '.'.charCodeAt(0)
var fs = require('fs')

// rather dangerous iplementation of nodejs resolve
// using node's private API
export default function resolve(opts) {
  opts = opts || {}
  const alias = opts.alias || {}
  const cjs = {}
  if (opts.cjs) {
    opts.cjs.forEach(function(m) {
      cjs[m] = true
    })
  }
  return {
    name: "resolve",
    resolveId: function(importee, importer) {
      // skip relative paths
      if (!importer || !importee/* || importee[0] === '.'*/) return null
      if (importee.charCodeAt(0) === DOT) {
        try {
          return require.resolve(path.join(path.dirname(importer), importee))
        } catch (err) {
          return null
        }
      }
      // skip strange importees
      if (!/^[\w]/.exec(importee)) return null

      // allow to define an alias path for an import
      if (alias[importee]) importee = alias[importee]

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
            return path.join(path.dirname(pkgPathAbs), entry)
          }
        }
      }
      return Module._findPath(importee, paths, false) || null
    }
  }
}
