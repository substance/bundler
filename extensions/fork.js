var _fork = require('./_fork')

/**
 * A bundler extension for executing command line commands in a forked process.
 *
 * @param {Bundler} b
 * @param {string} cmd
 * @param {Array<any>} args command line arguments
 * @param {object} options see [nodejs documentation](https://nodejs.org/api/child_process.html#child_process_child_process_fork_modulepath_args_options)
 * @param {boolean} options.silent no stdout and no stderr
 * @param {boolean} options.verbose show stdout and stderr
 * @param {boolean} options.await await command to be finished
 */
module.exports = function forkBundlerExtension (b, cmd, args = [], options = {}) {
  let msg = `Fork: ${cmd} ${args.join(' ')}`
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
      let p = _fork(cmd, args, options)
      if (options.await !== false) {
        return p
      } else {
        return Promise.resolve(true)
      }
    }
  })
}
