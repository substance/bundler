var Module = require('module');
var path = require('path');
var DOT = '.'.charCodeAt(0);

// rather dangerous iplementation of nodejs resolve
// using node's private API
export default function resolve() {
  return {
    name: "resolve",
    resolveId: function(importee, importer) {
      // skip relative paths
      if (!importer || !importee/* || importee[0] === '.'*/) return null;
      if (importee.charCodeAt(0) === DOT) {
        try {
          var id = path.join(path.dirname(importer), importee);
          return require.resolve(id);
        } catch (err) {
          return null;
        }
      }
      // skip strange importees
      if (!/^[\w]/.exec(importee)) return null;
      // console.log('## resolving %s from %s', importee, importer);
      var dirname = path.dirname(importer);
      var paths = Module._nodeModulePaths(dirname);
      var p = Module._findPath(importee, paths, false);
      if (p) {
        return p;
      }
    }
  }
}
