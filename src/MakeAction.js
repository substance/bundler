import { dirname, join, existsSync } from './fileUtils'
var fs = require('fs')

export default class MakeAction {

  constructor(bundler, otherModule, tasks) {
    this.bundler = bundler
    this.module = otherModule
    this.tasks = tasks || []
  }

  run(next) {
    const bundler = this.bundler
    const rootDir = bundler.rootDir
    const otherModule = this.module
    var makefile = join(rootDir, 'node_modules', otherModule, 'make.js')
    if (!existsSync(makefile)) {
      console.error('Could not find "make.js" in module "%s"', otherModule)
      return next()
    }
    // get the real location of the module in case
    // it is npm-linked
    makefile = fs.realpathSync(makefile)
    const cp = require('child_process')
    let args = this.tasks.concat(['--remote'])
    if (bundler.opts.watch) args.push('--watch')
    const child = cp.fork(makefile, args, {
      cwd: dirname(makefile)
    })
    child.on('message', function(msg) {
      if (msg === 'done') {
        next()
      }
    })
    child.on('error', function(error) {
      next(new Error(error))
    })
  }

  toString() {
    return "Make: " + this.module
  }
}
