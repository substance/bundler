var isPlainObject = require('../util/isPlainObject')
var _exec = require('./_exec')

module.exports = function(b, cmd, ...args) {
  let options
  // console.log('### exec', cmd, args, isPlainObject(args[0]))
  if (isPlainObject(args[args.length-1])) {
    options = args.pop()
  }
  if (args.length === 1) {
    args = args[0].split(/\s+/)
  }
  b.custom(`Exec: ${cmd} ${args}`, {
    execute() {
      return _exec(cmd, args, options)
    }
  })
}