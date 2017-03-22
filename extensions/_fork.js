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
      reject(error)
    })
    child.on('close', function(exitCode) {
      // console.log('##### closing %s: %s', cmd, exitCode)
      if (exitCode !== 0) {
        reject()
      } else {
        resolve()
      }
    })
  })
}