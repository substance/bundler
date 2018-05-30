const os = require('os')

module.exports = function (cmd, args, options = {}) {
  const silent = Boolean(options.silent)
  const verbose = Boolean(options.verbose) && !silent
  delete options.silent
  delete options.verbose
  const stdio = [0, verbose ? 1 : 'ignore', silent ? 'ignore' : 2]
  // ATTENTION: somehow under windows adding 'ipc' here, leads to an error
  if (os.platform() !== 'win32') stdio.push('ipc')
  return new Promise((resolve, reject) => {
    const opts = Object.assign({ stdio }, options)
    const cp = require('child_process')
    const child = cp.fork(cmd, args, opts)
    child.on('message', function (msg) {
      if (msg === 'done') { resolve() }
    })
    child.on('error', function (error) {
      reject(error)
    })
    child.on('close', function (exitCode) {
      // console.log('##### closing %s: %s', cmd, exitCode)
      if (exitCode !== 0) {
        reject(new Error('Exited with exitCode ' + exitCode))
      } else {
        resolve()
      }
    })
  })
}
