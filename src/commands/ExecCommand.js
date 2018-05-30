import {existsSync} from 'fs'
import Action from '../Action'

export default class ExecCommand {
  constructor (cmd, options = {}) {
    this.cmd = cmd
    this.options = options
  }

  get id () {
    return ['Exec:', this.cmd].join(' ')
  }

  get name () {
    return 'exec'
  }

  execute (bundler) {
    const action = new ExecAction(this)
    bundler._registerAction(action)
    return action.execute(bundler)
  }
}

class ExecAction extends Action {
  constructor (command) {
    super()

    this.command = command
    this.cmd = command.cmd
    this.options = command.options
  }

  get id () {
    return ['Exec: ', this.cmd].join('')
  }

  execute (bundler) {
    const exec = require('child_process').exec
    const cmd = this.cmd
    const options = this.options
    if (options.cwd && !existsSync(options.cwd)) {
      throw new Error('Directory does not exist! ' + options.cwd)
    }
    return new Promise((resolve, reject) => {
      bundler._info(this.descr)
      exec(cmd, options, (err) => {
        if (err) {
          reject(new Error(err))
        } else {
          resolve()
        }
      })
    })
  }
}
