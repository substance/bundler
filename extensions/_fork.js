module.exports = function (cmd, ...args) {
  return new Promise((resolve, reject) => {
    const cp = require('child_process')
    const child = cp.fork(cmd, args)
    child.on('message', function(msg) {
      if (msg === 'done') { resolve() }
    })
    child.on('error', function(error) {
      reject(new Error(error))
    })
    child.on('close', function(exitCode) {
      if (exitCode !== 0) {
        reject("Error: "+exitCode)
      } else {
        resolve()
      }
    })
  })
}