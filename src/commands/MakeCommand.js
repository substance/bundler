import * as fs from 'fs'
import * as path from 'path'
import Action from '../Action'

class MakeCommand {

  constructor(module, tasks) {
    this.module = module
    this.tasks = tasks || []
  }

  execute(bundler) {
    const tasks = this.tasks
    const module = this.module
    let makefile = path.join(bundler.rootDir, 'node_modules', module, 'make.js')
    if (!fs.existsSync(makefile)) {
      throw new Error('Could not find "make.js" in module "%s"', module)
    }
    // get the real location of the module in case
    // it is npm-linked
    makefile = fs.realpathSync(makefile)

    bundler._registerAction(new MakeAction(bundler, makefile, tasks))
  }
}

class MakeAction extends Action {

  constructor(bundler, makefile, tasks) {
    super([makefile])
    this.bundler = bundler
    this.makefile = makefile
    this.tasks = tasks
  }

  get id() {
    return ['Make:', this.makefile].concat(this.tasks).join(' ')
  }

  update(next) {
    console.info(this.id)
    const cp = require('child_process')
    const makefile = this.makefile
    let args = this.tasks.concat(['--remote'])
    if (this.bundler.opts.watch) args.push('--watch')
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