module.exports = function(b, cmd, ...args) {
  b.custom(`Fork: ${cmd}`, {
    execute() {
      return new Promise((resolve) => {
        const cp = require('child_process')
        const child = cp.fork(cmd, args)
        child.on('close', (code, signal) => {
          console.info('..finished', code, signal)
          resolve()
        })
      })
    }
  })
}