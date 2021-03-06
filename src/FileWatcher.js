import { EventEmitter } from 'events'
import { chokidar, debug } from './vendor'
import isWindows from './_isWindows'

const log = debug('bundler:file-watcher')

export default class FileWatcher extends EventEmitter {
  constructor (file) {
    super()

    const opts = {
      encoding: 'utf-8',
      persistent: true
    }
    // TODO: a good setting of awaitWriteFinish prevents double updates
    if (isWindows) {
      opts.awaitWriteFinish = true
    } else {
      opts.awaitWriteFinish = {
        stabilityThreshold: 100,
        pollInterval: 50
      }
    }

    this._file = file
    const watcher = chokidar.watch(file, opts)
    this._watcher = watcher
    watcher.setMaxListeners(0)
    watcher.on('error', function (err) {
      if (err.code === 'ENOENT') {
        // can't watch files that don't exist (e.g. injected by plugins somehow)
      } else {
        throw err
      }
    })
    watcher.on('unlink', this.onDelete.bind(this))
    watcher.on('change', this.onChange.bind(this))
  }

  close () {
    this._watcher.close()
  }

  onDelete (file) {
    log('File deleted: %s', file)
    this.emit('unlink', this._file)
    // TODO: we need to think about a way to explicitly free watchers
    // ATM, watchers are only freed when stopping the bundler
    // this.close()
  }

  onChange (file) {
    log('File changed: %s', file)
    this.emit('change', file)
  }
}
