/**
 * A bundler extension for running rollup.
 *
 * > Note: rollup and plugins are not installed automatically.
 *
 * @param {Bundler} b
 * @param {object} config see [rollup documentation](https://rollupjs.org/guide/en/#big-list-of-options)
 */
module.exports = function rollupBundlerExtension (b, config) {
  const rollup = require('rollup')
  let inputOptions = config
  let outputOptions = config.output
  let msg = `Rollup: ${config.input}`
  b.custom(msg, {
    src: null,
    dest: null,
    execute () {
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
                  console.log('Finished in %s ms', Date.now() - t0)
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
        return rollup.rollup(inputOptions).then(bundle => {
          if (Array.isArray(outputOptions)) {
            return Promise.all(outputOptions.map(output => bundle.write(output)))
          } else {
            return bundle.write(outputOptions)
          }
        })
      }
    }
  })
}
