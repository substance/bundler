import FileWatcher from './FileWatcher'

export default class Watcher{

  constructor() {
    this.watching = false
    this.watchEntries = {}
    this.fileWatchers = {}

    // make sure that watchers are disposed on exit
    this.stop = this.stop.bind(this)
    process.on('SIGINT', this.stop)
    process.on('exit', this.stop)
  }

  start() {
    if (this.watching) return
    var watchEntries = this.watchEntries
    var watchers = this.fileWatchers
    Object.keys(watchEntries).forEach(function(id) {
      var watcher = watchers[id]
      if (watcher) watcher.close()
      var watchEntry = watchEntries[id]
      watchers[id] = this._createWatcher(watchEntry)
    }.bind(this))
    this.watching = true
  }

  stop() {
    var watchEntries = this.watchEntries
    var watchers = this.fileWatchers
    Object.keys(watchEntries).forEach(function(id) {
      var watcher = watchers[id]
      if (watcher) {
        watcher.close()
        delete watchers[id]
      }
    })
    this.watching = false
  }

  watchFile(absPath, handler) {
    // console.log('### watching', absPath)
    var watchEntries = this.watchEntries
    var watchers = this.fileWatchers
    var watchEntry
    if (!watchEntries[absPath]) {
      watchEntry = {
        path: absPath,
        handlers: [handler],
      }
      watchEntries[absPath] = watchEntry
    } else {
      watchEntries[absPath].handlers.push(handler)
      return
    }
    if (this.watching) {
      watchers[absPath] = this._createWatcher(watchEntry)
    }
  }

  _createWatcher(watchEntry) {
    const w = new FileWatcher(watchEntry.path, _onChange.bind(null, watchEntry))
    // console.log('### watching %s', watchEntry.path)
    return w
  }
}

function _onChange(entry) {
  console.log('Changed: %s', entry.path)
  entry.handlers.forEach(function(handler) {
    handler(entry.path)
  })
}
