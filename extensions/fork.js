var fork = require('./_fork')

module.exports = function(b, cmd, ...args) {
  b.custom(`Fork: ${cmd} ${args}`, {
    execute() {
      return fork(cmd, args)
    }
  })
}