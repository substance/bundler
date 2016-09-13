import * as fs from 'fs'
import * as path from 'path'

class MakeCommand {

  constructor(module, tasks) {
    this.module = module
    this.tasks = tasks || []
  }

  get id() {
    return ['Make', this.module].concat(this.tasks).join(' ')
  }

  execute(bundler) {
    const tasks = this.tasks
    const module = this.module

    console.info(this.id)
    let makefile = path.join(bundler.rootDir, 'node_modules', module, 'make.js')
    if (!fs.existsSync(makefile)) {
      throw new Error('Could not find "make.js" in module "%s"', module)
    }
    makefile = fs.realpathSync(makefile)

    return new Promise(_runMake)

    function _runMake(resolve, reject) {
      // get the real location of the module in case
      // it is npm-linked
      const cp = require('child_process')
      let args = tasks.concat(['--remote'])
      if (bundler.opts.watch) args.push('--watch')
      const child = cp.fork(makefile, args, {
        cwd: path.dirname(makefile)
      })
      child.on('message', function(msg) {
        if (msg === 'done') {
          resolve()
        }
      })
      child.on('error', function(error) {
        reject(new Error(error))
      })
    }
  }
}

export default MakeCommand
