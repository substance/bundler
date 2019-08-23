/**
 * A bundler extension for running rollup.
 *
 * > Note: rollup and plugins are not installed automatically.
 *
 * @param {Bundler} b
 * @param {object} config see [rollup documentation](https://rollupjs.org/guide/en/#big-list-of-options)
 */
module.exports = function rollupBundlerExtension (b, config) {
  let descr
  if (Array.isArray(config)) {
    descr = `Rollup: ${config.map(c => c.input).join(', ')}`
  } else {
    descr = `Rollup: ${config.input}`
  }
  b.custom(descr, {
    src: null,
    dest: null,
    execute () {
      if (Array.isArray(config)) {
        return Promise.all(config.map(c => _execute(b, c)))
      } else {
        return _execute(b, config)
      }
    }
  })
}

function _execute (b, config) {
  const rollup = require('rollup')
  if (b.opts.watch) {
    return new Promise((resolve, reject) => {
      let watcher = rollup.watch(config)
      let initial = true
      let t0
      watcher.on('event', event => {
        switch (event.code) {
          case 'START': {
            if (!initial) {
              console.log(`Rollup: ${config.input}`)
              t0 = Date.now()
            }
            break
          }
          case 'END': {
            if (initial) {
              initial = false
              resolve()
            } else {
              let ellapsedTime = Date.now() - t0
              console.log(b.colors.green(`..finished in ${ellapsedTime} ms`))
            }
            break
          }
          case 'ERROR':
          case 'FATAL': {
            if (initial) {
              reject(event.error)
            } else {
              console.error(event.error)
            }
            break
          }
          default:
            // console.log(`Unhandled event: ${event.code}`)
        }
      })
    })
  } else {
    return rollup.rollup(config).then(bundle => {
      let outputOptions = config.output
      if (Array.isArray(outputOptions)) {
        return Promise.all(outputOptions.map(output => bundle.write(output)))
      } else {
        return bundle.write(outputOptions)
      }
    })
  }
}
