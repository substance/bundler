var _fork = require('./_fork')

module.exports = function(b, cmd, ...args) {
  if (args.length === 1) {
    args = args[0].split(/\s+/)
  }
  b.custom(`Fork: ${cmd} ${args}`, {
    execute() {
      return _fork(cmd, args)
    }
  })
}