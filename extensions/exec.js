var isPlainObject = require('../util/isPlainObject')
var _exec = require('./_exec')

module.exports = function(b, cmd, ...args) {
  let options
  // console.log('### exec', cmd, args, isPlainObject(args[0]))
  if (isPlainObject(args[args.length-1])) {
    options = args.pop()
  }
  if (args.length === 0) {
    const frags = cmd.split(/\s+/)
    cmd = frags[0]
    args = frags.slice(1)
  }
  let msg = `Exec: ${cmd} ${args}`
  if (options && options.cwd) {
    msg += ` in ${options.cwd}`
  }
  b.custom(msg, {
    execute() {
      return _exec(cmd, args, options)
    }
  })
}