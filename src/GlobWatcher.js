import { chokidar } from './vendor'

const opts = {
  encoding: 'utf-8',
  persistent: true,
  ignoreInitial: true
}

export default class GlobWatcher {

  constructor (pattern) {
    const watcher = chokidar.watch(pattern, opts)
    this._watcher = watcher
    watcher.setMaxListeners(0)
    watcher.on('error', function(err) {
      throw err
    })
  }

  close() {
    this._watcher.close()
  }

  on(evt, handler) {
    this._watcher.on(evt, handler)
  }
}
