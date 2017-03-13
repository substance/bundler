var isPlainObject = require('../util/isPlainObject')
var _exec = require('./_exec')

module.exports = function(b, cmd, ...args) {
  let options
  // console.log('### exec', cmd, args, isPlainObject(args[0]))
  if (isPlainObject(args[0])) {
    options = args.shift()
  }
  b.custom(`Exec: ${cmd} ${args}`, {
    execute() {
      return _exec(cmd, options, args)
    }
  })
}