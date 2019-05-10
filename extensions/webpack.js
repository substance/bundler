module.exports = function _webpack (b, config) {
  let webpack = require('webpack')
  let dest = config.output.path
  b.custom(`Webpack: ${dest}`, {
    src: null,
    dest,
    execute () {
      return new Promise((resolve, reject) => {
        function _handler (err, stats) {
          if (err) {
            console.error(err.stack || err)
            reject(err)
          } else if (stats.hasErrors()) {
            const info = stats.toJson()
            console.error(info.errors)
            reject(new Error(info.errors))
          } else {
            console.log('Finished in %s ms', stats.endTime - stats.startTime)
            resolve()
          }
        }
        if (b.opts.watch) {
          webpack(config).watch({}, _handler)
        } else {
          webpack(config, _handler)
        }
      })
    }
  })
}
