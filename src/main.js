// enabling source maps so that errors in bundler can be traced
require('source-map-support').install()

import { yargs } from './vendor'
import Bundler from './Bundler'

let argv = yargs
  // use this to start watcher
  .boolean('w').alias('w', 'watch').default('w', false)
  .boolean('s').alias('s', 'serve').default('s', false)
  .boolean('t').default('t', false)
  .argv

const showTasks = argv.t

let opts = {
  watch: argv.watch,
  serve: argv.serve
}

let bundler = new Bundler(opts)
bundler.yargs = yargs
bundler.argv = argv

const tasks = argv._

function _start() {
  if(showTasks) {
    console.info('Available tasks:')
    console.info(Object.keys(bundler._tasks).map(function(name){ return "  - "+name }).join('\n'))
    return
  }
  if (tasks.length > 0) {
    bundler._runTasks(tasks)
  } else if (bundler._tasks['default']) {
    bundler._runTask('default')
  }
  if (!bundler._hasScheduledActions()) {
    console.error('No action. ')
  }
  bundler._start()
}

process.once('beforeExit', _start)
bundler.once('done', function() {
  var watch = bundler.opts.watch
  var serve = bundler.opts.serve
  var remote = argv.remote
  if (showTasks) return
  if (serve) {
    bundler._startServing()
  }
  if (watch) {
    // start watching if this has been requested (default is false)
    if (!remote) {
      console.info('Watching for changes... Press CTRL-C to exit.')
    }
    bundler._startWatching()
  }
  if (!remote && !watch && !serve) {
    process.exit(0)
  }
})

if (argv.remote) {
  bundler.once('done', function() {
    process.send('done')
  })
}

export default bundler
