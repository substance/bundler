import { dirname, join, existsSync } from './fileUtils'

export default class MakeAction {

  constructor(bundler, otherModule) {
    this.bundler = bundler
    this.module = otherModule
  }

  run(next) {
    const bundler = this.bundler
    const rootDir = bundler.rootDir
    const otherModule = this.module
    var makefile = join(rootDir, 'node_modules', otherModule, 'make.js')
    if (!existsSync) {
      console.error('Could not resolve "%s"', otherModule)
      return
    }
    const cp = require('child_process')
    let args = ['--remote']
    if (bundler.watch) args.push('--watch')
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
