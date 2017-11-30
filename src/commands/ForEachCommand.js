import * as fs from 'fs'
import * as path from 'path'
import { isAbsolute } from '../fileUtils'
import { isFunction, fse, glob, colors } from '../vendor'
import Action from '../Action'
import randomId from '../randomId'

export default class ForEachCommand {

  constructor(description, pattern, handler) {
    this._id = randomId()
    this.description = description
    this.pattern = pattern
    this.handler = handler
    if (!isFunction(handler)) {
      throw new Error("'handler' must be a function")
    }
  }

  get id() {
    return this._id
  }

  get descr() {
    return this.description
  }

  get name() {
    return 'forEach'
  }

  execute(bundler) {
    const rootDir = bundler.rootDir
    const watcher = bundler.watcher
    const pattern = this.pattern
    let files = glob.sync(pattern, {})
    if (files) {
      files = files.map((file) => {
        return path.join(rootDir, file)
      })
      let t0 = Date.now()
      bundler._info(this.description)
      let actions = files.map((file) => {
        return this._createAction(bundler, file, 'first-pass')
      })
      watcher.watch(pattern, {
        add: function(file) {
          this._createAction(bundler, file)
        }
      })
      return Promise.all(actions).then(() => {
        bundler._info(colors.green('..finished in %s ms.'), Date.now()-t0)
      })
    } else {
      console.error('No files found for pattern %s', pattern)
    }
  }

  _createAction(bundler, file, firstPass) {
    let action = new FileAction(this.description, file, this.handler)
    bundler._registerAction(action)
    return action.execute(bundler, firstPass)
  }

}

class FileAction extends Action {

  constructor(title, file, handler) {
    super([file], [])
    this.handler = handler
    this.file = file

    this._id = randomId()
    this.title = title
  }

  get id() {
    return this._id
  }

  get description() {
    return this.title + ': ' + this.file
  }

  execute(bundler, firstPass) {
    if (firstPass) {
      bundler._info('.. '+ this.file)
    } else {
      bundler._info(this.title)
      bundler._info('.. '+ this.file)
    }
    let t0 = Date.now()
    let file = this.file
    if (!fs.existsSync(file)) {
      throw new Error('File does not exist:', file)
    }
    const action = this
    return Promise.resolve(
      this.handler(file, {
        readFileSync(f, ...args) {
          if (!isAbsolute(f)) {
            f = path.join(bundler.rootDir, f)
          }
          addInput(bundler, action, file)
          return fs.readFileSync(f, ...args)
        },
        writeFileSync(f, ...args) {
          if (!isAbsolute(f)) {
            f = path.join(bundler.rootDir, f)
          }
          addOutput(bundler, action, f)
          fse.ensureDirSync(path.basename(f))
          return fs.readFileSync(f, ...args)
        }
      })
    ).then(() => {
      if (!firstPass) {
        bundler._info(colors.green('..finished in %s ms.'), Date.now()-t0)
      }
    })
  }
}

function addInput(bundler, action, file) {
  if (action.inputs.indexOf(file) < 0) {
    action.inputs.push(file)
    bundler._registerActionInput(action, file)
  }
}

function addOutput(bundler, action, file) {
  if (action.outputs.indexOf(file) < 0) {
    action.outputs.push(file)
    bundler._registerActionOutput(action, file)
  }
}
