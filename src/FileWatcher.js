import { EventEmitter } from 'events'
import { chokidar } from './vendor'

const opts = {
  encoding: 'utf-8',
  persistent: true
}

export default class FileWatcher extends EventEmitter {

  constructor (file) {
    this._file = file
    const watcher = chokidar.watch(file, opts)
    this._watcher = watcher
    watcher.setMaxListeners(0)
    watcher.on('error', function(err) {
      if ( err.code === 'ENOENT' ) {
        // can't watch files that don't exist (e.g. injected by plugins somehow)
      } else {
        throw err
      }
    }.bind(this))
    watcher.on('unlink', this.onDelete.bind(this))
    watcher.on('change', this.onChange.bind(this))
  }

  close() {
    this._watcher.close()
  }

  onDelete(file) {
    this.close()
    console.info('Deleted: %s', file)
    this.emit('unlink', this._file)
  }

  onChange(file, stats) {
    // HACK: when we write files we receive two change events
    // the first is actually not the real one
    // However, this way we loose changes that empty a file
    // Maybe we should kind of throttle the event?
    if (stats.size === 0) return
    console.info('Changed: %s', file)
    this.emit('change', file, stats)
  }
}
