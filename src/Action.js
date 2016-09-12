import { fse } from './vendor'
import log from './log'

export default class Action {

  constructor(inputs, outputs) {
    this.inputs = inputs || []
    this.outputs = outputs || []
  }

  invalidate() {
    this.outputs.forEach(function(file) {
      log('Invalidating %s', file)
      fse.removeSync(file)
    })
  }

  update(next) {} // eslint-disable-line no-unused-vars

  get id() {
    return String(this.inputs) + '->' + String(this.outputs)
  }

  get descr() {
    return this.id
  }
}
