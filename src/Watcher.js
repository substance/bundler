import { glob, isString } from './vendor'
import { isAbsolute } from './fileUtils'
import FileWatcher from './FileWatcher'
import GlobWatcher from './GlobWatcher'

export default class Watcher {
  constructor () {
    this.watching = false
    this.watchEntries = {}
    this.watchers = {}

    // make sure that watchers are disposed on exit
    this.stop = this.stop.bind(this)
    process.on('SIGINT', this.stop)
    process.on('exit', this.stop)
  }

  start () {
    if (this.watching) return
    var watchEntries = this.watchEntries
    var watchers = this.watchers
    Object.keys(watchEntries).forEach(function (id) {
      var watcher = watchers[id]
      if (watcher) watcher.close()
      var watchEntry = watchEntries[id]
      watchers[id] = this._createWatcher(watchEntry)
    }.bind(this))
    this.watching = true
  }

  stop () {
    var watchEntries = this.watchEntries
    var watchers = this.watchers
    Object.keys(watchEntries).forEach(function (id) {
      var watcher = watchers[id]
      if (watcher) {
        watcher.close()
        delete watchers[id]
      }
    })
    this.watching = false
  }

  watch (patternOrPath, hooks) {
    if (!patternOrPath || !isString(patternOrPath)) {
      throw new Error('Watcher.watch(): invalid path ' + patternOrPath)
    }
    const watchEntries = this.watchEntries
    const watchers = this.watchers
    let watchEntry
    let type = glob.hasMagic(patternOrPath) ? 'glob' : 'file'
    if (type === 'file' && !isAbsolute(patternOrPath)) {
      throw new Error('Only absolute file paths are allowed. Was ' + patternOrPath)
    }
    if (!watchEntries[patternOrPath]) {
      watchEntry = {
        type: type,
        path: patternOrPath,
        handlers: [hooks]
      }
      watchEntries[patternOrPath] = watchEntry
    } else {
      watchEntries[patternOrPath].handlers.push(hooks)
      return
    }
    if (this.watching) {
      watchers[patternOrPath] = this._createWatcher(watchEntry)
    }
  }

  _createWatcher (watchEntry) {
    const w = watchEntry.type === 'file'
      ? new FileWatcher(watchEntry.path)
      : new GlobWatcher(watchEntry.path)
    // console.log('### watching %s', watchEntry.path)
    watchEntry.handlers.forEach(function (hooks) {
      Object.keys(hooks).forEach(function (evt) {
        w.on(evt, hooks[evt])
      })
    })
    return w
  }
}
