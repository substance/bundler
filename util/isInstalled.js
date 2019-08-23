var Module = require('module')

module.exports = function isInstalled (moduleName, options = {}) {
  const rootDir = options.rootDir || process.cwd()
  // install only if not yet installed
  // TODO: we should compare the version if given
  let lookupPaths = Module._nodeModulePaths(rootDir)
  let modulePath = Module._findPath(moduleName, lookupPaths, false)
  return Boolean(modulePath)
}
