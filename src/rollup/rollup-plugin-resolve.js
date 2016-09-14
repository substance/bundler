var Module = require('module')
var path = require('path')
var DOT = '.'.charCodeAt(0)
var fs = require('fs')

// rather dangerous iplementation of nodejs resolve
// using node's private API
export default function resolve(opts) {
  opts = opts || {}
  const alias = opts.alias || {}
  const jsnext = {}
  if (opts.jsnext) {
    opts.jsnext.forEach(function(m) {
      jsnext[m] = true
    })
  }
  return {
    name: "resolve",
    resolveId: function(importee, importer) {
      // skip relative paths
      if (!importer || !importee/* || importee[0] === '.'*/) return null
      if (importee.charCodeAt(0) === DOT) {
        try {
          var id = path.join(path.dirname(importer), importee)
          return require.resolve(id)
        } catch (err) {
          return null
        }
      }
      // skip strange importees
      if (!/^[\w]/.exec(importee)) return null
      if (alias[importee]) {
        importee = alias[importee]
      }
      // console.log('## resolving %s from %s', importee, importer)
      var dirname = path.dirname(importer)
      var paths = Module._nodeModulePaths(dirname)
      if (jsnext[importee]) {
        // console.log('### looking for jsnext', importee)
        let pkgPath = importee+"/package.json"
        var pkgPathAbs = Module._findPath(pkgPath, paths, false)
        if(!pkgPathAbs) return
        // console.log('### .. found package', pkgPathAbs)
        var pkg = fs.readFileSync(pkgPathAbs, 'utf8')
        pkg = JSON.parse(pkg)
        var entry = pkg['jsnext:main']
        if (!entry) return
        // console.log('### .. jsnext:main', entry)
        return path.join(path.dirname(pkgPathAbs), entry)
      }
      var p = Module._findPath(importee, paths, false)
      if (p) {
        return p
      }
    }
  }
}
