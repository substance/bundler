import * as fs from 'fs'
import * as path from 'path'
import { isAbsolute } from '../fileUtils'
import { isFunction, fse, glob, colors } from '../vendor'
import Action from '../Action'
import randomId from '../randomId'

export default class ForEachCommand {

  constructor(pattern, handler) {
    this._id = randomId()
    this.description = `forEach(${pattern})...`
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
      let t0 = Date.now()
      bundler._info(this.description)
      let actions = files.map((file) => {
        let absFile = !isAbsolute(file) ? path.join(rootDir, file) : file
        return this._createAction(bundler, file, absFile, 'first-pass')
      })
      watcher.watch(pattern, {
        add: function(file) {
          let absFile = !isAbsolute(file) ? path.join(rootDir, file) : file
          this._createAction(bundler, file, absFile)
        }
      })
      return Promise.all(actions).then(() => {
        bundler._info(colors.green('..finished in %s ms.'), Date.now()-t0)
      })
    } else {
      console.error('No files found for pattern %s', pattern)
    }
  }

  _createAction(bundler, file, absFile, firstPass) {
    let action = new FileAction(this.description, file, absFile, this.handler)
    bundler._registerAction(action)
    return action.execute(bundler, firstPass)
  }

}

class FileAction extends Action {

  constructor(title, file, absFile, handler) {
    super([absFile], [])
    this.handler = handler
    this.file = file
    this.absFile = absFile

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
    if (!firstPass) {
      bundler._info(this.title)
    }
    let t0 = Date.now()
    let file = this.file
    let absFile = this.absFile
    if (!fs.existsSync(absFile)) {
      throw new Error('File does not exist:', absFile)
    }
    const action = this
    return Promise.resolve(
      this.handler(file, {
        readFileSync(f, ...args) {
          if (!isAbsolute(f)) {
            f = path.join(bundler.rootDir, f)
          }
          addInput(bundler, action, f)
          return fs.readFileSync(f, ...args)
        },
        writeFileSync(f, ...args) {
          if (!isAbsolute(f)) {
            f = path.join(bundler.rootDir, f)
          }
          addOutput(bundler, action, f)
          fse.ensureDirSync(path.dirname(f))
          return fs.writeFileSync(f, ...args)
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