import * as fs from 'fs'
import * as path from 'path'

class MakeCommand {

  constructor(module, tasks) {
    this.module = module
    this.tasks = tasks || []
  }

  get id() {
    return ['MakeCommand', this.module].concat(this.tasks).join(' ')
  }

  execute(bundler, next) {
    console.info(this.id)
    const module = this.module
    let makefile = path.join(bundler.rootDir, 'node_modules', module, 'make.js')
    if (!fs.existsSync(makefile)) {
      throw new Error('Could not find "make.js" in module "%s"', module)
    }
    makefile = fs.realpathSync(makefile)
    // get the real location of the module in case
    // it is npm-linked
    const cp = require('child_process')
    let args = this.tasks.concat(['--remote'])
    if (bundler.opts.watch) args.push('--watch')
    const child = cp.fork(makefile, args, {
      cwd: path.dirname(makefile)
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
}

export default MakeCommand
