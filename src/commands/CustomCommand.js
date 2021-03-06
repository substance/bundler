import * as fs from 'fs'
import * as path from 'path'
import { isAbsolute, isDirectory, copySync, mkDirSync, rmSync, writeSync } from '../fileUtils'
import { isFunction, isArray, uniq, fse, glob, colors } from '../vendor'
import Action from '../Action'
import randomId from '../randomId'

export default class CustomCommand {
  constructor (description, params) {
    this._id = randomId()
    this.description = description
    this.src = params.src
    this.dest = params.dest
    this._execute = params.execute
    if (!isFunction(this._execute)) {
      throw new Error("'execute' must be a function")
    }
  }

  get id () {
    return this._id
  }

  get descr () {
    return this.description
  }

  get name () {
    return 'custom'
  }

  execute (bundler) {
    if (this.src && isArray(this.src)) {
      return this._executeWithCollection(bundler)
    } else if (this.src && glob.hasMagic(this.src)) {
      return this._executeWithGlob(bundler)
    } else {
      return this._executeWithoutGlob(bundler)
    }
  }

  _executeWithoutGlob (bundler) {
    let src = this.src
    let dest = this._normalizedDest(bundler)
    if (src && !isAbsolute(src)) src = path.join(bundler.rootDir, src)
    const action = new CustomAction(this._id, this.description, [src], dest, this._execute, false)
    bundler._registerAction(action)
    return action.execute(bundler)
  }

  _executeWithGlob (bundler) {
    const rootDir = bundler.rootDir
    const watcher = bundler.watcher
    const pattern = this.src
    let dest = this._normalizedDest(bundler)
    let files = glob.sync(pattern, {})
    if (files) {
      files = files.map(function (file) {
        return path.join(rootDir, file)
      })
      const action = new CustomAction(this._id, this.description, files, dest, this._execute, true)
      bundler._registerAction(action)
      let result = action.execute(bundler)
      // TODO: need to rework the whole dynamic registry stuff
      watcher.watch(pattern, {
        add: function (file) {
          action.inputs.push(file)
          action.inputs = uniq(action.inputs)
          const _actionsByInput = bundler._actionsByInput
          if (!_actionsByInput[file]) _actionsByInput[file] = []
          _actionsByInput[file] = uniq(_actionsByInput[file].concat(action))
        }
      })
      return result
    } else {
      console.error('No files found for pattern %s', pattern)
    }
  }

  _executeWithCollection (bundler) {
    const rootDir = bundler.rootDir
    const watcher = bundler.watcher
    let dest = this._normalizedDest(bundler)
    let files = []
    let patterns = []
    this.src.forEach(function (fileOrPattern) {
      if (glob.hasMagic(fileOrPattern)) {
        patterns.push(fileOrPattern)
        files = files.concat(glob.sync(fileOrPattern, {}))
      } else {
        files.push(fileOrPattern)
      }
    })
    if (files.length) {
      files = files.map(function (file) {
        return path.join(rootDir, file)
      })
      const action = new CustomAction(this._id, this.description, files, dest, this._execute, true)
      bundler._registerAction(action)
      let result = action.execute(bundler)
      patterns.forEach(function (pattern) {
        // TODO: need to rework the whole dynamic registry stuff
        watcher.watch(pattern, {
          add: function (file) {
            action.inputs.push(file)
            action.inputs = uniq(action.inputs)
            const _actionsByInput = bundler._actionsByInput
            if (!_actionsByInput[file]) _actionsByInput[file] = []
            _actionsByInput[file] = uniq(_actionsByInput[file].concat(action))
          }
        })
      })
      return result
    } else {
      console.error('No files found for pattern %s', patterns)
    }
  }

  _normalizedDest (bundler) {
    const rootDir = bundler.rootDir
    let dest = this.dest
    if (dest) {
      if (!isArray(dest)) dest = [dest]
      dest = dest.map(d => {
        if (d && !isAbsolute(d)) d = path.join(rootDir, d)
        return d
      })
    } else {
      dest = []
    }
    return dest
  }
}

class CustomAction extends Action {
  constructor (id, description, inputs, outputs, _execute, multipleSourceFiles) {
    super(inputs.filter(Boolean), outputs.filter(Boolean))
    this._id = id
    this._description = description
    this._execute = _execute
    this._watched = new Set()
    this._multipleSourceFiles = multipleSourceFiles
  }

  get id () {
    return this._id
  }

  get description () {
    return this._description
  }

  execute (bundler) {
    bundler._info(this._description)
    let t0 = Date.now()
    this.outputs.forEach(function (f) {
      fse.ensureDirSync(path.dirname(f))
    })
    let inputs = this.inputs.filter(function (file) {
      return fs.existsSync(file)
    })
    let api = {
      watch: (file) => {
        if (!isAbsolute(file)) file = path.join(bundler.rootDir, file)
        this._addWatcher(bundler, file)
      },
      // providing some fs api
      isAbsolute,
      isDirectory,
      copySync,
      mkDirSync,
      rmSync,
      writeFileSync: writeSync
    }
    if (!this._multipleSourceFiles) {
      inputs = inputs[0]
    }
    return Promise.resolve(this._execute(inputs, api))
      .then(function () {
        bundler._info(colors.green('..finished in %s ms.'), Date.now() - t0)
      })
  }

  _addWatcher (bundler, absPath) {
    const watcher = bundler.watcher
    const _onChange = () => {
      _invalidate()
      bundler._schedule(this)
    }
    const _invalidate = () => {
      this.invalidate()
      for (let output of this.outputs) {
        bundler._invalidate(output)
      }
    }
    if (!this._watched.has(absPath)) {
      watcher.watch(absPath, {
        change: _onChange,
        unlink: _invalidate
      })
      this._watched.add(absPath)
    }
  }
}
