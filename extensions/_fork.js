module.exports = function (cmd, args, options = {}) {
  const silent = Boolean(options.silent)
  const verbose = Boolean(options.verbose) && !silent
  delete options.silent
  delete options.verbose
  // ATTENTION: in contrast to 'cp.spawn()' a fork must have an 'ipc' channel
  // while spawn() must not have one under windows
  const stdio = [0, verbose ? 1 : 'ignore', silent ? 'ignore' : 2, 'ipc']
  return new Promise((resolve, reject) => {
    const opts = Object.assign({ stdio }, options)
    const cp = require('child_process')
    const child = cp.fork(cmd, args, opts)
    child.on('message', function (msg) {
      if (msg === 'done') { resolve({ running: true }) }
    })
    child.on('error', function (error) {
      reject(error)
    })
    child.on('close', function (exitCode) {
      resolve({ exitCode })
    })
  })
}
