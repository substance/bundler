var _exec = require('./_exec')
var Module = require('module')

module.exports = function(b, moduleName, version) {
  // install only if not yet installed
  // TODO: we should compare the version if given
  let lookupPaths = Module._nodeModulePaths(b.rootDir)
  let modulePath = Module._findPath(moduleName, lookupPaths, false)
  if (!modulePath) {
    const args = ['install']
    let moduleStr = moduleName
    if (version) {
      moduleStr += '@'+version
    }
    args.push(moduleStr)
    b.custom(`npm install: ${moduleStr}`, {
      execute() {
        return _exec('npm', null, args)
      }
    })
  } else {
    // console.info('Found module', moduleName)
  }
}