import { fse, debug } from './vendor'
const log = debug('bundler:action')

export default class Action {
  constructor (inputs, outputs) {
    this.inputs = inputs || []
    this.outputs = outputs || []
  }

  invalidate () {
    // nothing by default
    // Note: some actions use Action.removeOutputs()
  }

  get id () {
    return String(this.inputs) + '->' + String(this.outputs)
  }

  get descr () {
    return this.id
  }

  _removeOutputs () {
    Action.removeOutputs(this)
  }

  static removeOutputs (action) {
    action.outputs.forEach(function (file) {
      log('Invalidating %s', file)
      fse.removeSync(file)
    })
  }
}
