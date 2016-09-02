import { chokidar } from './vendor'

const opts = { encoding: 'utf-8', persistent: true }

export default class FileWatcher {
  constructor ( file, onChange, onDispose ) {
    this._file = file
    this._changeHook = onChange
    this._disposeHook = onDispose
    this._fileExists = true

    const watcher = chokidar.watch(file, opts)
    this._watcher = watcher
    watcher.setMaxListeners(0)
    watcher.on('error', function(err) {
      if ( err.code === 'ENOENT' ) {
        // can't watch files that don't exist (e.g. injected by plugins somehow)
        this._fileExists = false
      } else {
        throw err
      }
    }.bind(this))
    watcher.on('unlink', this.onUnlink.bind(this))
    watcher.on('change', this.onChange.bind(this))
  }

  close() {
    this._watcher.close()
    if (this._disposeHook) {
      this._disposeHook(this._file)
    }
  }

  onUnlink() {
    this.close()
  }

  onChange(_, stats) {
    // HACK: when we write files we receive two change events
    // the first is actually not the real one
    // However, this way we loose changes that empty a file
    // Maybe we should kind of throttle the event?
    if (stats.size === 0) return
    this._changeHook(this._file)
  }
}
