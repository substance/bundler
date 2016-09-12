import Action from '../Action'

export default
class ExecuteCommand extends Action {

  constructor(bundler, command) {
    super()
    this.bundler = bundler
    this.command = command
  }

  update() {
    this.command.execute(this.bundler)
  }

  get id() {
    return "Executing Command: " + this.command.constructor.name
  }
}
