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

  update (next) {} // eslint-disable-line no-unused-vars

  get id () {
    return String(this.inputs) + '->' + String(this.outputs)
  }

  get descr () {
    return this.id
  }
}

Action.removeOutputs = function (action) {
  action.outputs.forEach(function (file) {
    log('Invalidating %s', file)
    fse.removeSync(file)
  })
}
