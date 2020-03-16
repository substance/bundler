module.exports = function _runAndMonitorDevServer (b, mainScript, args = [], dependencies = []) {
  const cp = require('child_process')
  let firstTime = true
  let child
  function _restart () {
    child.kill()
    console.log('Restarting development server')
    const delay = 250
    setTimeout(() => {
      _fork()
    }, delay)
  }
  function _fork () {
    child = cp.fork(mainScript, args, {
      stdio: [0, 1, 2, 'ipc']
    })
    // HACK: under windows only plain ipc com is working
    if (process.platform === 'win32') {
      child.on('message', msg => {
        if (msg === 'disposed') {
          _restart()
        }
      })
    }
  }
  b.custom('Running and monitoring development server', {
    src: [mainScript].concat(dependencies),
    execute () {
      // running for the first time
      if (firstTime) {
        firstTime = false
        return new Promise((resolve, reject) => {
          _fork()
          child.on('message', function (msg) {
            if (msg === 'done') resolve()
          })
          child.on('error', function (error) {
            reject(error)
          })
        })
      } else if (child) {
        if (process.platform === 'win32') {
          // Note: only classical ipc com works platform independently
          child.send('dispose')
        } else {
          _restart()
        }
      }
    }
  })
}
