const path = require('path')

/**
 * A bundler extension for running karma.
 *
 * > Note: karma and plugins are not installed automatically.
 *
 * @param {Bundler} b
 * @param {object} [options]
 * @param {string} options.configFile location of the karma configuration file. See [karma documentation](http://karma-runner.github.io/4.0/config/configuration-file.html)
 * @param {Array<string>} options.browsers override for config.browsers
 * @param {boolean} options.singleRun override for config.singleRun
 * @param {boolean} options.failOnEmptyTestSuite override for config.failOnEmptyTestSuite
 */
module.exports = function karmaBundlerExtension (b, options = {}) {
  const configFile = options.configFile || path.join(process.cwd(), 'karma.conf.js')
  const browsers = options.browsers || ['Chrome']
  const singleRun = (options.singleRun !== false)
  const failOnEmptyTestSuite = Boolean(options.failOnEmptyTestSuite)
  b.custom('Running Karma...', {
    execute: function () {
      let karma = require('karma')
      return new Promise(function (resolve) {
        let fails = 0
        const server = new karma.Server({
          configFile: configFile,
          browsers,
          singleRun,
          failOnEmptyTestSuite
        }, function (exitCode) {
          // why is exitCode always == 1?
          if (fails > 0) {
            process.exit(exitCode)
          } else {
            resolve()
          }
        })
        server.on('run_complete', function (browsers, results) {
          if (results && results.failed > 0) {
            fails += results.failed
          }
        })
        server.start()
      })
    }
  })
}
