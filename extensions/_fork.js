module.exports = function (cmd, args, options={}) {
  const silent = Boolean(options.silent)
  const verbose = Boolean(options.verbose) && !silent
  return new Promise((resolve, reject) => {
    const opts = {
      stdio: [0, verbose ? 1 : 'ignore', silent ? 'ignore' : 2, 'ipc']
    }
    const cp = require('child_process')
    const child = cp.fork(cmd, args, opts)
    child.on('message', function(msg) {
      if (msg === 'done') { resolve() }
    })
    child.on('error', function(error) {
      reject(new Error(error))
    })
    child.on('close', function(exitCode) {
      if (exitCode !== 0) {
        reject(new Error(exitCode))
      } else {
        resolve()
      }
    })
  })
}