var isPlainObject = require('../util/isPlainObject')
var _exec = require('./_exec')

module.exports = function (b, cmd, ...args) {
  let options
  // console.log('### exec', cmd, args, isPlainObject(args[0]))
  if (isPlainObject(args[args.length - 1])) {
    options = args.pop()
  }
  if (args.length === 1) {
    args = args[0].split(/\s+/)
  }
  let msg = `Exec: ${cmd} ${args.join(' ')}`
  if (options && options.cwd) {
    msg += ` in ${options.cwd}`
  }
  let src = options.src
  let dest = options.dest
  delete options.src
  delete options.dest
  b.custom(msg, {
    src,
    dest,
    execute () {
      // console.log('Running _exec with:')
      // console.log('  cmd:', cmd)
      // console.log('  args:', args.join(' '))
      // console.log('  options:', JSON.stringify(options, 0, 2))
      let p = _exec(cmd, args, options)
      if (options.await !== false) {
        return p
      } else {
        return Promise.resolve(true)
      }
    }
  })
}
