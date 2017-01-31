import * as fs from 'fs'
import * as path from 'path'
import { isAbsolute } from '../fileUtils'
import { isFunction, isArray, uniq, fse, glob, colors } from '../vendor'
import Action from '../Action'
import randomId from '../randomId'

export default class CustomCommand {

  constructor(description, params) {
    this._id = randomId()
    this.description = description
    this.src = params.src
    this.dest = params.dest
    this._execute = params.execute
    if (!isFunction(this._execute)) {
      throw new Error("'execute' must be a function")
    }
  }

  get id() {
    return this._id
  }

  get descr() {
    return this.description
  }

  execute(bundler) {
    if (this.src && isArray(this.src)) {
      return this._executeWithCollection(bundler)
    } else if (this.src && glob.hasMagic(this.src)) {
      return this._executeWithGlob(bundler)
    } else {
      return this._executeWithoutGlob(bundler)
    }
  }

  _executeWithoutGlob(bundler) {
    let src = this.src
    let dest = this.dest
    if (src && !isAbsolute(src)) src = path.join(bundler.rootDir, src)
    if (dest && !isAbsolute(dest)) dest = path.join(bundler.rootDir, dest)
    const action = new CustomAction(this._id, this.description, [src], [dest], this._execute)
    bundler._registerAction(action)
    return action.execute()
  }

  _executeWithGlob(bundler) {
    const rootDir = bundler.rootDir
    const watcher = bundler.watcher
    const pattern = this.src
    let dest = this.dest
    if (!isAbsolute(dest)) dest = path.join(rootDir, dest)
    let files = glob.sync(pattern, {})
    if (files) {
      files = files.map(function(file) {
        return path.join(rootDir, file)
      })
      const action = new CustomAction(this._id, this.description, files, [dest], this._execute)
      bundler._registerAction(action)
      let result = action.execute()
      // TODO: need to rework the whole dynamic registry stuff
      watcher.watch(pattern, {
        add: function(file) {
          action.inputs.push(file)
          action.inputs = uniq(action.inputs)
          const _actionsByInput = bundler._actionsByInput
          if (!_actionsByInput[file]) _actionsByInput[file] = []
          _actionsByInput[file] = uniq(_actionsByInput[file].push(action))
        }
      })
      return result
    } else {
      console.error('No files found for pattern %s', pattern)
    }
  }

  _executeWithCollection(bundler) {
    const rootDir = bundler.rootDir
    const watcher = bundler.watcher
    let dest = this.dest
    if (!isAbsolute(dest)) dest = path.join(rootDir, dest)
    let files = []
    let patterns = []
    this.src.forEach(function(fileOrPattern) {
      if (glob.hasMagic(fileOrPattern)) {
        patterns.push(fileOrPattern)
        files = files.concat(glob.sync(fileOrPattern, {}))
      } else {
        files.push(fileOrPattern)
      }
    })
    if (files.length) {
      files = files.map(function(file) {
        return path.join(rootDir, file)
      })
      const action = new CustomAction(this._id, this.description, files, [dest], this._execute)
      bundler._registerAction(action)
      let result = action.execute()
      patterns.forEach(function(pattern) {
        // TODO: need to rework the whole dynamic registry stuff
        watcher.watch(pattern, {
          add: function(file) {
            action.inputs.push(file)
            action.inputs = uniq(action.inputs)
            const _actionsByInput = bundler._actionsByInput
            if (!_actionsByInput[file]) _actionsByInput[file] = []
            _actionsByInput[file] = uniq(_actionsByInput[file].push(action))
          }
        })
      })
      return result
    } else {
      console.error('No files found for pattern %s', patterns)
    }
  }

}

class CustomAction extends Action {
  constructor(id, description, inputs, outputs, _execute) {
    super(inputs.filter(Boolean), outputs.filter(Boolean))
    this._id = id
    this._description = description
    this._execute = _execute
  }

  get id() {
    return this._id
  }

  get description() {
    return this._description
  }

  execute() {
    console.info(this._description)
    var t0 = Date.now()
    this.outputs.forEach(function(f) {
      fse.ensureDirSync(path.dirname(f))
    })
    let inputs = this.inputs.filter(function(file) {
      return fs.existsSync(file)
    })
    return Promise.resolve(this._execute(inputs))
    .then(function() {
      console.info(colors.green('..finished in %s ms.'), Date.now()-t0)
    })
  }
}
