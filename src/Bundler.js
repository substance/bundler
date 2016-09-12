import { EventEmitter } from 'events'
import * as path from 'path'
import { isFunction, express } from './vendor'
import Watcher from './Watcher'

import CopyCommand from './commands/CopyCommand'
import MakeCommand from './commands/MakeCommand'
import MinifyCommand from './commands/MinifyCommand'
import RemoveCommand from './commands/RemoveCommand'
import RollupCommand from './commands/RollupCommand'
import log from './log'

export default class Bundler extends EventEmitter {

  constructor(opts) {
    super()

    this.opts = opts || {}
    this.rootDir = process.cwd()

    this.watcher = new Watcher()
    this.server = new express()
    this._serverPort = 4000

    // an action is registerd via a file id
    // whenever the file changes the action gets scheduled
    this._actions = {}

    // a task is just a function executing commands
    // or registering actions
    this._tasks = {}

    // a queue for sequencing actions
    this._jobs = []
    this._actionsByInput = {}

    // flags
    this._started = false
    this._running = false

    process.on('SIGINT', function() {
      process.exit(0)
    })
  }

  execute(cmd) {
    // log('Executing command', cmd)
    cmd.execute(this)
  }

  make(other, ...tasks) {
    this.execute(new MakeCommand(other, tasks))
  }

  copy(src, dest, opts) {
    this.execute(new CopyCommand(src, dest, opts))
  }

  js(src, targets, opts) {
    this.execute(new RollupCommand(src, targets, opts))
  }

  rm(rmPath) {
    this.execute(new RemoveCommand(rmPath))
  }

  minify(src) {
    this.execute(new MinifyCommand(src))
  }

  task(name, deps, fn) {
    log('Registering task', name)
    if (isFunction(deps)) {
      fn = deps
      deps = []
    }
    this._tasks[name] = { fn: fn, deps: deps }
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
      folder = path.join(rootDir, folder)
      log('Adding static route %s -> %s', route, folder)
      server.use(route, express.static(folder))
    }
  }

  _registerAction(action) {
    const watcher = this.watcher
    const id = action.id
    if (this._actions[id]) {
      console.error('Action %s is already registered')
      return
    }
    this._schedule(action)
    action.inputs.forEach(function(input) {
      log('Watching ', input)
      watcher.watch(input, {
        change: this._onChange.bind(this),
        unlink: this._onUnlink.bind(this)
      })
      if (!this._actionsByInput[input]) {
        this._actionsByInput[input] = {}
      }
      this._actionsByInput[input][id] = action
    }.bind(this))
  }

  _onChange(file) {
    log('File changed: %s', file)
    this._invalidate(file)
    // schedule updates
    const actions = this._getActions(file)
    actions.forEach(function(action) {
      this._schedule(action)
    }.bind(this))
  }

  _onUnlink(file) {
    log('File deleted: %s', file)
    // TODO: maybe we should unregister the action
    // when the file is deleted
    this._invalidate(file)
  }

  _invalidate(file) {
    log('Invalidating', file)
    const actions = this._getActions(file)
    actions.forEach(function(action) {
      action.invalidate()
    })
  }

  _getActions(file) {
    let visited = {}
    let queue = [file]
    let actions = []
    while(queue.length > 0) {
      const next = queue.shift()
      const nextActions = this._actionsByInput[next]
      for (var id in nextActions) {
        if (!nextActions.hasOwnProperty(id)) continue
        if (visited[id]) continue
        const action = nextActions[id]
        visited[id] = true
        actions.push(action)
        queue = queue.concat(action.outputs)
      }
    }
    return actions
  }

  _startWatching() {
    this.watcher.start()
  }

  _startServing() {
    console.info('Starting server on port %s...', this._serverPort)
    this.server.listen(this._serverPort)
  }

  _schedule(action) {
    log('Scheduling action: %s', action.id)
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
    console.info(action.descr)
    if (action.update.length > 0) {
      try {
        action.update(function(err) {
          if (err) {
            if (err.stack) console.error(err.stack)
            else console.error(err.toString())
          }
          process.nextTick(this._step.bind(this))
        }.bind(this))
      } catch (err) {
        if (err.stack) console.error(err.stack)
        else console.error(err.toString())
        process.nextTick(this._step.bind(this))
      }
    } else {
      try {
        action.update()
      } catch (err) {
        if (err.stack) console.error(err.stack)
        else console.error(err.toString())
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
