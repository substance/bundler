import EventEmitter from 'events'

import { isFunction, forEach, express } from './vendor'
import { join } from './fileUtils'

import CopyAction from './CopyAction'
import MakeAction from './MakeAction'
import MinifyAction from './MinifyAction'
import RemoveAction from './RemoveAction'
import RollupAction from './RollupAction'
import Watcher from './Watcher'

export default class Bundler extends EventEmitter {

  constructor(opts) {
    super()

    this.opts = opts || {}
    this.rootDir = process.cwd()
    this.watcher = new Watcher()
    this.server = new express()
    this._serverPort = 4000

    this.cache = {}

    // task registry
    this._tasks = {}

    // sequencing
    this._jobs = []

    // flags
    this._started = false
    this._running = false

    // bind API methods
    Bundler.API.forEach(function(api) {
      this[api] = this[api].bind(this)
    }.bind(this))

    process.on('SIGINT', function() {
      process.exit(0)
    })
  }

  configure(opts) {
    forEach(opts, function(subOpts, key) {
      this.opts[key] = Object.assign(this.opts[key]||{}, subOpts)
    }.bind(this))
  }

  make(other, ...tasks) {
    return this._schedule(new MakeAction(this, other, tasks))
  }

  copy(src, dest, opts) {
    return this._schedule(new CopyAction(this, src, dest, opts))
  }

  js(src, targets, opts) {
    return this._schedule(new RollupAction(this, src, targets, opts))
  }

  rm(rmPath) {
    return this._schedule(new RemoveAction(this, rmPath))
  }

  task(name, deps, fn) {
    if (isFunction(deps)) {
      fn = deps
      deps = []
    }
    this._tasks[name] = { fn: fn, deps: deps }
  }


  minify(src) {
    return this._schedule(new MinifyAction(this, src))
  }

  setServerPort(port) {
    this._serverPort = port
  }

  serve(params) {
    const server = this.server
    const rootDir = this.rootDir
    if (params.static) {
      const route = params.route
      let folder = params.folder
      if (!route || !folder) {
        throw new Error("Parameters 'route' and 'folder' required.")
      }
      folder = join(rootDir, folder)
      // console.log('## Adding static route %s -> %s', route, folder)
      server.use(route, express.static(folder))
    }
  }

  _startWatching() {
    this.watcher.start()
  }

  _startServing() {
    console.info('Starting server on port %s...', this._serverPort)
    this.server.listen(this._serverPort)
  }

  _schedule(action) {
    if (!this._started) {
      this._jobs.push(action)
    } else {
      process.nextTick(function() {
        this._jobs.push(action)
        if (!this._running) {
          this._running = true
          this._next()
        }
      }.bind(this))
    }
    return action
  }

  _start() {
    this._started = true
    this._running = true
    this._step()
  }

  _next() {
    const action = this._jobs.shift()
    console.info(action.toString())
    if (action.run.length > 0) {
      action.run(function(err) {
        if (err) {
          console.error(err.toString())
          if (err.stack) console.error(err.stack)
        }
        process.nextTick(this._step.bind(this))
      }.bind(this))
    } else {
      try {
        action.run()
      } catch (err) {
        console.error(err.toString())
        if (err.stack) console.error(err.stack)
      }
      process.nextTick(this._step.bind(this))
    }
  }

  _step() {
    if (this._jobs.length > 0) {
      this._next()
    } else {
      this._running = false
      this.emit('done')
    }
  }

  _runTasks(names) {
    names.forEach(function(name) {
      this._runTask(name)
    }.bind(this))
  }

  _runTask(name, state) {
    state = state || {}
    if (state[name] === 'done') return
    const task = this._tasks[name]
    state[name] = 'visiting'
    if (task.deps) {
      task.deps.forEach(function(dep) {
        if (state[dep] === 'visiting') {
          throw new Error('Cyclic dependency detected in task ' + dep)
        } else if (state[dep] === 'done') {
          return
        } else {
          this._runTask(dep, state)
        }
      }.bind(this))
    }
    if (task.fn) task.fn()
    state[name] = 'done'
  }

}

Bundler.API = [ 'configure', 'copy', 'js', 'make', 'minify', 'rm', 'task' ]
