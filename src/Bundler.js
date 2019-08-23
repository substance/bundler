import { EventEmitter } from 'events'
import * as path from 'path'
import {
  isFunction, uniq, express,
  colors, debug
} from './vendor'
import { writeSync as _writeSync, isDirectory as _isDirectory } from './fileUtils'
import Watcher from './Watcher'
import Task from './Task'
import CopyCommand from './commands/CopyCommand'
import CustomCommand from './commands/CustomCommand'
import ExecCommand from './commands/ExecCommand'
import MakeCommand from './commands/MakeCommand'
import MinifyCommand from './commands/MinifyCommand'
import RemoveCommand from './commands/RemoveCommand'
import PostCSSCommand from './commands/PostCSSCommand'

const log = debug('bundler')

export default class Bundler extends EventEmitter {
  constructor (opts) {
    super()

    this.opts = opts || {}
    this.rootDir = process.cwd()

    this.watcher = new Watcher()
    this.server = new express() // eslint-disable-line new-cap
    this._serverPort = 4000

    // an action is registerd via a file id
    // whenever the file changes the action gets scheduled
    this._actions = {}
    this._actionsByInput = {}
    this._generatedFiles = {}

    // a task is just a function executing commands
    // or registering actions
    this._tasks = {}

    // a queue for sequencing actions
    this._scheduledActions = []
    this._scheduledActionIds = {}

    // flags
    this._started = false
    this._running = false
    this._firstRun = true

    this._step = this._step.bind(this)

    process.on('SIGINT', function () {
      log('received SIGINT')
      process.exit(0)
    })
  }

  make (other, ...tasks) {
    return this._scheduleCommand(new MakeCommand(other, tasks))
  }

  copy (src, dest, opts) {
    return this._scheduleCommand(new CopyCommand(src, dest, opts))
  }

  cp (...args) {
    return this.copy(...args)
  }

  custom (description, params) {
    return this._scheduleCommand(new CustomCommand(description, params))
  }

  exec (cmd, options) {
    return this._scheduleCommand(new ExecCommand(cmd, options))
  }

  css (src, dest, opts) {
    return this._scheduleCommand(new PostCSSCommand(src, dest, opts))
  }

  rm (rmPath) {
    return this._scheduleCommand(new RemoveCommand(rmPath))
  }

  minify (src, opts) {
    return this._scheduleCommand(new MinifyCommand(src, opts))
  }

  task (name, deps, fn) {
    log('Registering task', name)
    if (isFunction(deps)) {
      fn = deps
      deps = []
    }
    const task = new Task(name, fn, deps)
    this._tasks[name] = task
    return task
  }

  setServerPort (port) {
    this._serverPort = port
  }

  serve (params) {
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

  writeFileSync (dest, buf) {
    _writeSync(dest, buf)
  }

  writeSync (dest, buf) {
    console.warn('DEPRECATED: use b.writeFileSync()')
    this.writeFileSync(dest, buf)
  }

  isDirectory (p) {
    return _isDirectory(p)
  }

  _scheduleCommand (cmd) {
    const entry = this._schedule(cmd)
    return entry.promise
  }

  _info (...args) {
    if (!this.silent) {
      console.info.apply(console, args)
    }
  }

  _hasScheduledActions () {
    return this._scheduledActions.length > 0
  }

  _registerAction (action) {
    const id = action.id
    // skip if the same action is already registered
    if (this._actions[id]) return
    this._actions[id] = action
    action.inputs.forEach((input) => {
      this._registerActionInput(action, input)
    })
    action.outputs.forEach((output) => {
      this._registerActionOutput(action, output)
    })
  }

  _registerActionInput (action, input) {
    const watcher = this.watcher
    // if no other action has been registered as generator
    // then we add a file watcher
    if (!this._generatedFiles[input]) {
      log('Watching ', input)
      watcher.watch(input, {
        change: this._onChange.bind(this),
        unlink: this._onUnlink.bind(this)
      })
    }
    if (!this._actionsByInput[input]) {
      this._actionsByInput[input] = []
    }
    this._actionsByInput[input].push(action)
    this._actionsByInput[input] = uniq(this._actionsByInput[input])
  }

  _registerActionOutput (action, output) {
    this._generatedFiles[output] = true
  }

  _onChange (file) {
    this._invalidate(file)
    const actions = this._actionsByInput[file] || []
    actions.forEach(function (action) {
      log('Rescheduling action', action.id)
      this._schedule(action)
    }.bind(this))
  }

  _onUnlink (file) {
    // TODO: maybe we should unregister the action
    // when the file is deleted
    this._invalidate(file)
  }

  _invalidate (file) {
    log('Invalidating', file)
    const actions = this._getAllActions(file)
    actions.forEach(function (action) {
      action.invalidate()
    })
  }

  // find all actions by investigating action input-output dependencies
  _getAllActions (file) {
    let visited = {}
    let queue = [file]
    let actions = []
    while (queue.length > 0) {
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

  _startWatching () {
    this.watcher.start()
  }

  _startServing () {
    this._info('Starting server on port %s...', this._serverPort)
    this.server.listen(this._serverPort)
  }

  _schedule (action) {
    const id = action.id
    const schedule = this._scheduledActions
    const scheduledIds = this._scheduledActionIds
    // action is already scheduled
    if (scheduledIds[id]) {
      let idx = -1
      for (let i = 0; i < schedule.length; i++) {
        if (schedule[i].action.id === id) {
          idx = i
          break
        }
      }
      if (idx < 0) {
        console.error('Internal Error: tried to reschedule an action with id "%s"', id)
        process.exit(1)
      }
      schedule.splice(idx, 1)
    }

    log('Scheduling action: %s', id)
    const entry = { action }
    // return a promise so that you
    // can do things such as b.js().then(...)
    entry.promise = new Promise((resolve, reject) => {
      entry.resolve = resolve
      entry.reject = reject
    })
    if (!this._started) {
      schedule.push(entry)
      scheduledIds[id] = true
    } else {
      process.nextTick(function () {
        schedule.push(entry)
        scheduledIds[id] = true
        if (!this._running) {
          this._running = true
          this._next()
        }
      }.bind(this))
    }
    return entry
  }

  _start () {
    log('Bundler is starting...')
    this._started = true
    this._running = true
    this._step()
  }

  _next () {
    const self = this
    const entry = this._scheduledActions.shift()
    const action = entry.action
    const id = action.id
    const _step = this._step
    delete this._scheduledActionIds[id]
    try {
      Promise.resolve(action.execute(this))
        .then(_next)
        .catch(_catch)
    } catch (err) {
      _catch(err)
    }

    function _next () {
      const outputs = action.outputs || []
      outputs.forEach(function (output) {
        const nextActions = self._actionsByInput[output] || []
        nextActions.forEach(function (action) {
          self._schedule(action)
        })
      })
      entry.resolve()
      // give the system some time if something goes wrong
      // e.g. bundler is in an infinite update look for instance
      setTimeout(_step, 10)
    }

    function _catch (err) {
      log('caught exception in action:', err)
      if (err) {
        if (err.stack) {
          console.error(colors.red('\nError during execution of Command '), colors.white(action.name))
          console.error(colors.red(err.toString()))
          console.error('Stacktrace:')
          console.error(err.stack)
        } else {
          console.error(err.toString())
        }
      }
      if (self._firstRun) {
        log('... exiting after error on first run')
        process.exit(1)
      } else {
        entry.reject(err)
        _next()
      }
    }
  }

  _step () {
    if (this._scheduledActions.length > 0) {
      this._next()
    } else {
      this._running = false
      this._firstRun = false
      this.emit('done')
    }
  }

  _runTasks (names) {
    names.forEach(function (name) {
      this._runTask(name)
    }.bind(this))
  }

  _runTask (name, state) {
    state = state || {}
    if (state[name] === 'done') return
    const task = this._tasks[name]
    if (!task) {
      console.error("Unknown task: '%s'. Exiting", name)
      process.exit()
    }
    state[name] = 'visiting'
    if (task.deps && !this.opts.nodeps) {
      task.deps.forEach(function (dep) {
        if (state[dep] === 'visiting') {
          throw new Error('Cyclic dependency detected in task ' + dep)
        } else if (state[dep] === 'done') {

        } else {
          this._runTask(dep, state)
        }
      }.bind(this))
    }
    if (task.fn) task.fn()
    state[name] = 'done'
  }

  get _isBundler () { return true }
}
