import * as path from 'path'
import * as fs from 'fs'
import { fse } from '../vendor'
import Action from '../Action'

export default class RemoveCommand {

  constructor(rmPath) {
    this.rmPath = rmPath
  }

  get id() {
    return ['RemoveCommand:', this.rmPath].join(' ')
  }

  execute(bundler, next) {
    let rmPath = this.rmPath
    if (rmPath[0] === '.') {
      rmPath = path.join(bundler.rootDir, rmPath)
    }
    if (fs.existsSync(rmPath)) {
      // console.info(this.id)
      fse.removeSync(this.rmPath)
    }
    next()
  }
}
