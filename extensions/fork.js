var isPlainObject = require('../util/isPlainObject')
var _fork = require('./_fork')

module.exports = function (b, cmd, ...args) {
  let options
  // console.log('### exec', cmd, args, isPlainObject(args[0]))
  if (isPlainObject(args[args.length - 1])) {
    options = args.pop()
  }
  if (args.length === 1) {
    args = args[0].split(/\s+/)
  }
  let src = options.src
  let dest = options.dest
  b.custom(`Fork: ${cmd} ${args}`, {
    src,
    dest,
    execute () {
      let p = _fork(cmd, args, options)
      if (options.await !== false) {
        return p
      } else {
        return Promise.resolve(true)
      }
    }
  })
}
