import * as path from 'path'
import { isAbsolute } from '../fileUtils'
import { isArray, isFunction, fse } from '../vendor'
import Action from '../Action'
import randomId from '../randomId'

export default class CustomCommand {

  constructor(description, params) {
    this._id = randomId()
    this.description = description
    this.inputs = params.src || []
    this.outputs = params.dest || []
    this._execute = params.execute
    if (!isArray(this.inputs)) {
      this.inputs = [this.inputs]
    }
    if (!isArray(this.outputs)) {
      this.outputs = [this.outputs]
    }
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
    const inputs = this.inputs.map(function(f) {
      if (!isAbsolute(f)) f = path.join(bundler.rootDir, f)
      return f
    })
    const outputs = this.outputs.map(function(f) {
      if (!isAbsolute(f)) f = path.join(bundler.rootDir, f)
      return f
    })
    const action = new CustomAction(this._id, this.description, inputs, outputs, this._execute)
    bundler._registerAction(action)
    return action.execute(bundler)
  }
}

class CustomAction extends Action {
  constructor(id, description, inputs, outputs, _execute) {
    super(inputs, outputs)
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

  execute(bundler) {
    console.info(this._description)
    var t0 = Date.now()
    this.outputs.forEach(function(f) {
      fse.ensureDirSync(path.dirname(f))
    })
    return Promise.resolve(this._execute(bundler))
    .then(function() {
      console.info('..finished in %s ms', Date.now()-t0)
    })
  }
}
