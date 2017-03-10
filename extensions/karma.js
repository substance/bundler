const path = require('path')

module.exports = function(b, options = {}) {
  const configFile = options.configFile || path.join(process.cwd(), 'karma.conf.js')
  const browsers = options.browser || ['Chrome']
  const singleRun = (options.singleRun !== false)
  const failOnEmptyTestSuite = Boolean(options.failOnEmptyTestSuite)
  b.custom('Running Karma...', {
    execute: function() {
      let karma = require('karma')
      return new Promise(function(resolve) {
        let fails = 0
        const server = new karma.Server({
          configFile: __dirname + '/karma.conf.js',
          browsers,
          singleRun,
          failOnEmptyTestSuite
        }, function() {
          // why is exitCode always == 1?
          if (fails > 0) {
            process.exit(1)
          } else {
            resolve()
          }
        })
        server.on('run_complete', function(browsers, results) {
          if (results && results.failed > 0) {
            fails += results.failed
          }
        })
        server.start()
      })
    }
  })
}