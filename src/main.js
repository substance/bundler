import { yargs, colors } from './vendor'
import Bundler from './Bundler'
import log from './log'

// enabling source maps so that errors in bundler can be traced
require('source-map-support').install()

const argv = yargs
  // use this to start watcher
  .boolean('h').alias('h', 'help').default('h', false)
  .boolean('w').alias('w', 'watch').default('w', false)
  .boolean('s').alias('s', 'serve').default('s', false)
  .boolean('t').default('t', false)
  .boolean('n').alias('n', 'nodeps').default('n', false)
  .argv

const showHelp = argv.h
const showTasks = argv.t

const bundler = new Bundler({
  watch: argv.watch,
  serve: argv.serve,
  nodeps: argv.nodeps
})
bundler.yargs = yargs
bundler.argv = argv
bundler.autorun = true
const tasks = argv._

bundler.usage = `
  node make --help
    shows this help

  node make -t
    shows a summary of all available tasks

  node make [-w] [-s] ...<task>
    runs one or multiple tasks and all their dependencies

  Options:
    -w:     watch for file changes
    -s:     start http server
`
function _start () {
  if (bundler.autorun) {
    if (showHelp) {
      console.info('Usage:')
      console.info(bundler.usage)
      return
    } else if (showTasks) {
      const tasks = bundler._tasks
      console.info('Available tasks:')
      console.info(Object.keys(tasks).map((name) => {
        const task = tasks[name]
        const frags = ['  - ', colors.green(name)]
        if (task.description) {
          frags.push(colors.white(': '))
          frags.push(task.description)
        }
        return frags.join('')
      }).join('\n'))
      return
    }
    if (tasks.length > 0) {
      log('One or more tasks specified. Start running tasks')
      bundler._runTasks(tasks)
    } else if (bundler._tasks['default']) {
      log('No tasks specified. Start running default task')
      bundler._runTask('default')
    }
    if (!bundler._hasScheduledActions()) {
      console.error('No action. ')
    }
  }
  bundler._start()
}

process.once('beforeExit', _start)
bundler.once('done', function () {
  log('received done...')
  if (showHelp || showTasks || !bundler.autorun) return
  const watch = bundler.opts.watch
  const serve = bundler.opts.serve
  const remote = argv.remote
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
})

if (argv.remote) {
  bundler.once('done', function () {
    process.send('done')
  })
}

export default bundler
