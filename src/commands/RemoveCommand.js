import * as path from 'path'
import * as fs from 'fs'
import { fse } from '../vendor'
import Action from '../Action'

export default class RemoveCommand {

  constructor(rmPath) {
    this.rmPath = rmPath
  }

  execute(bundler) {
    let rmPath = this.rmPath
    if (rmPath[0] === '.') {
      rmPath = path.join(bundler.rootDir, rmPath)
    }
    bundler._registerAction(new RemoveAction(rmPath))
  }
}

class RemoveAction extends Action {

  constructor(rmPath) {
    super()

    this.rmPath = rmPath
  }

  get id() {
    return ['Remove:', this.rmPath].join(' ')
  }

  update() {
    if (fs.existsSync(this.rmPath)) {
      // console.info(this.id)
      fse.removeSync(this.rmPath)
    }
  }

}
