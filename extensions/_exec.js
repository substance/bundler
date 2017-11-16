const os = require('os')

const IGNORE = 'ignore'

module.exports = function (cmd, args, options = {}) {
  const silent = Boolean(options.silent)
  const verbose = Boolean(options.verbose) && !silent
  delete options.silent
  delete options.verbose
  const stdio = [0, verbose ? 1 : IGNORE, silent ? IGNORE : 2]
  // TODO: somehow under windows adding 'ipc' here, leads
  // to an error
  if (os.platform() !== 'win32') stdio.push('ipc')
  return new Promise((resolve, reject) => {
    const opts = Object.assign({ stdio }, options)
    const cp = require('child_process')
    const child = cp.spawn(cmd, args, opts)
    child.on('message', (msg) => {
      if (msg === 'done') resolve()
    })
    child.on('error', (error) => {
      reject(error)
    })
    child.on('close', (exitCode) => {
      // console.log('##### closing %s: %s', cmd, exitCode)
      if (exitCode !== 0) {
        reject()
      } else {
        resolve()
      }
    })
  })
}