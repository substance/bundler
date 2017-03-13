module.exports = function (cmd, options, args) {
  options = options || {}
  // console.log('### _exec', cmd, options, args)
  const verbose = Boolean(options.verbose)
  const silent = Boolean(options.silent)
  return new Promise((resolve, reject) => {
    cmd = [cmd].concat(args).join(' ')
    // console.log('### Executing', cmd)
    const cp = require('child_process')
    cp.exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error(error, stderr)
        reject(error)
      } else {
        if (!silent) {
          if (verbose && stdout) {
            console.info(stdout.toString())
          }
          if (stderr) {
            console.error(stderr.toString())
          }
        }
        resolve()
      }
    })
  })
}