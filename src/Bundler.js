import { EventEmitter } from 'events'
import * as path from 'path'
import { isFunction, express } from './vendor'
import Watcher from './Watcher'

import CopyCommand from './commands/CopyCommand'
import CustomCommand from './commands/CustomCommand'
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
    this._actionsByInput = {}

    // a task is just a function executing commands
    // or registering actions
    this._tasks = {}

    // a queue for sequencing actions
    this._scheduledActions = []
    this._scheduledActionIds = {}

    // flags
    this._started = false
    this._running = false

    process.on('SIGINT', function() {
      process.exit(0)
    })
  }

  make(other, ...tasks) {
    this._schedule(new MakeCommand(other, tasks))
  }

  copy(src, dest, opts) {
    this._schedule(new CopyCommand(src, dest, opts))
  }

  custom(description, params) {
    this._schedule(new CustomCommand(description, params))
  }

  js(src, targets, opts) {
    this._schedule(new RollupCommand(src, targets, opts))
  }

  rm(rmPath) {
    this._schedule(new RemoveCommand(rmPath))
  }

  minify(src) {
    this._schedule(new MinifyCommand(src))
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

  _hasScheduledActions() {
    return this._schedule.length > 0
  }

  _registerAction(action) {
    const watcher = this.watcher
    const id = action.id
    // skip if the same action is already registered
    if (this._actions[id]) return
    this._actions[id] = action
    action.inputs.forEach(function(input) {
      log('Watching ', input)
      watcher.watch(input, {
        change: this._onChange.bind(this),
        unlink: this._onUnlink.bind(this)
      })
      if (!this._actionsByInput[input]) {
        this._actionsByInput[input] = []
      }
      this._actionsByInput[input].push(action)
    }.bind(this))
  }

  _onChange(file) {
    this._invalidate(file)
    const actions = this._actionsByInput[file] || []
    actions.forEach(function(action) {
      this._schedule(action)
    }.bind(this))
  }

  _onUnlink(file) {
    // TODO: maybe we should unregister the action
    // when the file is deleted
    this._invalidate(file)
  }

  _invalidate(file) {
    log('Invalidating', file)
    const actions = this._getAllActions(file)
    actions.forEach(function(action) {
      action.invalidate()
    })
  }

  // find all actions by investigating action input-output dependencies
  _getAllActions(file) {
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
    const id = action.id
    const schedule = this._scheduledActions
    const scheduledIds = this._scheduledActionIds
    // action is already scheduled
    if (scheduledIds[id]) {
      let idx = -1
      for (let i = 0; i < schedule.length; i++) {
        if (schedule[i].id === id) {
          idx = i
          break
        }
      }
      if (idx < 0) throw new Error('Internal error.')
      schedule.splice(idx, 1)
    }
    log('Scheduling action: %s', id)
    if (!this._started) {
      schedule.push(action)
      scheduledIds[id] = true
    } else {
      process.nextTick(function() {
        schedule.push(action)
        scheduledIds[id] = true
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
    const action = this._scheduledActions.shift()
    const id = action.id
    const _step = this._step.bind(this)
    delete this._scheduledActionIds[id]
    try {
      Promise.resolve(action.execute(this))
      .then(_next)
      .catch(_catch)
    } catch (err) {
      _catch(err)
    }

    function _next() {
      process.nextTick(_step)
    }

    function _catch(err) {
      if (err.stack) console.error(err.stack)
      else console.error(err.toString())
      _next()
    }
  }

  _step() {
    if (this._scheduledActions.length > 0) {
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
