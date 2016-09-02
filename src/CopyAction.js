import {
  basename, copySync, isAbsolute, isDirectory, join,
  relative, sep, walk
} from './fileUtils'

export default class CopyAction {

  constructor(bundler, src, dest, opts) {
    var rootDir = bundler.rootDir
    // console.log('### Bundler.copy', src, dest)
    opts = opts || {}
    if (!isAbsolute(src)) src = join(rootDir, src)
    if (!isAbsolute(dest)) dest = join(rootDir, dest)

    if (isDirectory(src) || dest[dest.length-1] === sep) {
      dest = join(dest, basename(src))
    }

    this.bundler = bundler
    this.src = src
    this.dest = dest
    this.opts = opts
  }

  run() {
    var src = this.src
    var dest = this.dest
    copySync(src, dest)

    const watcher = this.bundler.watcher
    if (isDirectory(src)) {
      // TODO: walk src and register watchers
      walk(src)
      .on('data', function (item) {
        const absPath = item.path
        if (isDirectory(item.path)) return
        let relPath = relative(src, absPath)
        let destPath = join(dest, relPath)
        watcher.watchFile(absPath, this._onChange.bind(this, absPath, destPath))
      }.bind(this))
    } else {
      watcher.watchFile(src, this._onChange.bind(this, src, dest))
    }
  }

  toString() {
    return this._descr(this.src, this.dest)
  }

  _descr(src, dest) {
    const rootDir = this.bundler.rootDir
    return ['Copy: ', relative(rootDir, src), ' -> ', relative(rootDir, dest)].join('')
  }

  _onChange(src, dest) {
    const bundler = this.bundler
    const self = this
    bundler._schedule({
      run() { copy(src, dest) },
      toString() {
        return self._descr(src, dest)
      }
    })
  }
}
