const fs = require('fs')

/**
 * A bundler extension for running postcss.
 *
 * @param {Bundler} b
 * @param {object} config
 * @param {string} config.src location of the CSS entry file
 * @param {string} config.dest output location
 * @param {function} [config.postcss] postcss instance
 *    If not provided, bundler's built-in postcss is used
 * @param {array<postcss.Plugin>} [config.plugins] postcss plugins
 *    If not provided, bundler uses the following pre-defined plugins:
 *      - [postcss-import](https://www.npmjs.com/package/postcss-import)
 *      - [postcss-reporter](https://www.npmjs.com/package/postcss-reporter)
 * @param {string} [config.processsOptions] postcss.process() options (see [postcss documentation](http://api.postcss.org/global.html#processOptions))
 *    The default processOptions are:
 *    ```
 *    {
 *      map: { inline: false }
 *    }
 *    ```
 */
module.exports = function postcssBundlerExtension (b, config) {
  let { src, dest } = config
  let descr = `PostCSS: ${dest}`
  b.custom(descr, {
    src: src,
    dest: dest,
    execute (file, { watch, writeFileSync }) {
      let { postcss, plugins, processOptions } = _getPostcssConfig(config)
      processOptions = Object.assign({
        from: src,
        to: dest,
        map: { inline: false }
      }, processOptions)
      const css = fs.readFileSync(file, 'utf8')
      return postcss(plugins)
        .process(css, processOptions)
        .then(result => {
          const deps = result.messages.filter(
            message => message.type === 'dependency'
          )
          for (let dep of deps) {
            watch(dep)
          }
          if (result.map) {
            writeFileSync(dest + '.map', JSON.stringify(result.map))
          }
          writeFileSync(dest, result.css)
        })
    }
  })
}

function _getPostcssConfig (options) {
  let builtIns = _getBuiltIns()
  let postcss = options.postcss || builtIns.postcss
  let plugins = options.plugins || [builtIns.postcssImport, builtIns.postcssReporter]
  let processOptions = options.processOptions || {}
  return {
    postcss,
    plugins,
    processOptions
  }
}

function _getBuiltIns () {
  let { postcss, postcssImport, postcssReporter } = require('../dist/vendor')
  return { postcss, postcssImport, postcssReporter }
}
