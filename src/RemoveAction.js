import {
  join, relative, removeSync
} from './fileUtils'

export default class RemoveAction {

  constructor(bundler, rmPath) {
    if (rmPath[0] === '.') {
      rmPath = join(bundler.rootDir, rmPath)
    }
    this.bundler = bundler
    this.rmPath = rmPath
  }

  run() {
    removeSync(this.rmPath)
  }

  toString() {
    const bundler = this.bundler
    return "Remove: " + relative(bundler.rootDir, this.rmPath)
  }
}
