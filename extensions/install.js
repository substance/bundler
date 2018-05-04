var isInstalled = require('../util/isInstalled')
var _exec = require('./_exec')

module.exports = function(b, moduleName, version) {
  if (!isInstalled(moduleName, { rootDir: b.rootDir })) {
    const args = ['install', '--no-save', '--no-package-lock']
    let moduleStr = moduleName
    if (version) {
      moduleStr += '@'+version
    }
    args.push(moduleStr)
    b.custom(`npm install: ${moduleStr}`, {
      execute() {
        return _exec('npm', args, { shell: true })
      }
    })
  } else {
    // console.info('Found module', moduleName)
  }
}