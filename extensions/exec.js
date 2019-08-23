const _exec = require('./_exec')

/**
 * A bundler extension for executing command line commands.
 *
 * > Note: karma and plugins are not installed automatically.
 *
 * @param {Bundler} b
 * @param {string} cmd
 * @param {Array<any>} args command line arguments
 * @param {object} options
 * @param {string} options.cwd working directory
 * @param {string|array<string>} options.src input file(s) or glob pattern(s) (will be watched)
 * @param {string|array<string>} options.dest output files
 */
module.exports = function (b, cmd, args = [], options = {}) {
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
