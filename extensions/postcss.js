const fs = require('fs')
const { postcss: builtInPostcss, postcssImport, postcssReporter, omit } = require('../dist/vendor')

/**
 * A bundler extension for running postcss.
 *
 * @param {Bundler} b
 * @param {object} config postcss configuration (process options) (see [postcss documentation](http://api.postcss.org/global.html#processOptions))
 * @param {string} config.from location of the CSS entry file
 * @param {string} config.to output file
 * @param {array<postcss.Plugin>} [config.plugins] postcss plugins
 *    If not provided, bundler uses the following pre-defined plugins:
 *      - [postcss-import](https://www.npmjs.com/package/postcss-import)
 *      - [postcss-reporter](https://www.npmjs.com/package/postcss-reporter)
 * @param {string} config.map [config.processsOptions]
 *    The default `map` setting is `{ inline: false }`
 * @param {function} [config.postcss] postcss instance
 *    If not provided, bundler's built-in postcss is used
 */
module.exports = function postcssBundlerExtension (b, config) {
  let { from, to } = config
  let descr = `PostCSS: ${from} -> ${to}`
  b.custom(descr, {
    src: from,
    dest: to,
    execute (file, { watch, writeFileSync }) {
      let { postcss, plugins, processOptions } = _getPostcssConfig(config)
      const css = fs.readFileSync(from, 'utf8')
      return postcss(plugins)
        .process(css, processOptions)
        .then(result => {
          const deps = result.messages.filter(
            message => message.type === 'dependency'
          )
          for (let dep of deps) {
            watch(dep.file)
          }
          if (result.map) {
            writeFileSync(to + '.map', JSON.stringify(result.map))
          }
          writeFileSync(to, result.css)
        })
    }
  })
}

function _getPostcssConfig (options) {
  let postcss = options.postcss || builtInPostcss
  let plugins = options.plugins || [postcssImport, postcssReporter]
  let processOptions = Object.assign(
    { map: { inline: false } },
    omit(options, 'postcss', 'plugins')
  )
  return {
    postcss,
    plugins,
    processOptions
  }
}
