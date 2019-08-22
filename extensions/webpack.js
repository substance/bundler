const { colors } = require('../dist/vendor')

module.exports = function _webpack (b, config) {
  if (!b._isBundler) {
    throw new Error('Expected a Bundler instance as first argument.')
  }
  let webpack = require('webpack')
  let dest
  // support for multiple target configuration
  if (Array.isArray(config)) {
    dest = config.map(c => c.output.fileName).filter(Boolean)
  } else {
    dest = config.output.fileName
  }
  // TODO: maybe we create a nicer display, for now only output file name(s)
  b.custom(`Webpack: ${dest}`, {
    src: null,
    dest,
    execute () {
      return new Promise((resolve, reject) => {
        let _firstRun = true
        function _handler (err, stats) {
          if (err) {
            console.error(err.stack || err)
            reject(err)
          } else if (stats.hasErrors()) {
            const info = stats.toJson('normal')
            console.error(info.errors)
            reject(new Error(info.errors))
          } else {
            let toStringOpts = { colors: true }
            let ellapsedTime = stats.endTime - stats.startTime
            console.log(stats.toString(toStringOpts))
            if (_firstRun) {
              _firstRun = false
            } else {
              console.log(colors.green(`..finished in ${ellapsedTime} ms`))
            }
            resolve()
          }
        }
        if (b.opts.watch) {
          let compiler = webpack(config)
          compiler.watch({}, _handler)
          compiler.hooks.watchRun.tap('bundler-plugin-webpack', () => {
            console.log(`Webpack: ${dest}`)
          })
        } else {
          webpack(config, _handler)
        }
      })
    }
  })
}
