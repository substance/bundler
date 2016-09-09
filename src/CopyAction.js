import {
  basename, copySync, removeSync, isAbsolute, isDirectory, join,
  relative, sep, glob
} from './fileUtils'

/*
  Copy a single file into dist folder:
  ```
    copy('./foo.js', 'dist/')
  ```

  Copy a single file with renaming
  ```
    copy('./foo.js', 'dist/bar.js')
  ```

  Copy a whole directory into dist folder
  ```
    copy('./assets', 'dist/')
  ```

  Copy a whole directory into dist folder with renaming
  ```
    copy('./node_modules/substance/dist', 'dist/substance')
  ```

  Copy with glob pattern
  ```
    copy('./node_modules/substance/packages/**\/*.css', 'dist/styles/', { root: './node_modules/substance/'})
  ```
*/

export default class CopyAction {

  constructor(bundler, src, dest, opts) {
    var rootDir = bundler.rootDir
    // console.log('### Bundler.copy', src, dest)
    opts = opts || {}
    this.bundler = bundler
    this.src = src
    if (!isAbsolute(dest)) dest = join(rootDir, dest)
    this.dest = dest
    this.opts = opts
  }

  run(next) {
    if (glob.hasMagic(this.src)) {
      this._runWithGlob(next)
    }
    else if (isDirectory(this.src)) {
      this.opts.root = this.src
      this.src = this.src+"/**/*"
      this._runWithGlob(next)
    }
    else {
      this._runWithoutGlob(next)
    }
  }

  _runWithoutGlob(next) {
    const rootDir = this.bundler.rootDir
    const watcher = this.bundler.watcher
    let dest = this.dest
    var src = this.src
    if (!isAbsolute(src)) src = join(rootDir, src)
    const lastIsSlash = (dest[dest.length-1] === sep)
    if (lastIsSlash) {
      dest = join(dest, basename(src))
    }
    copySync(src, dest)
    watcher.watch(src, {
      'change': this._onChange.bind(this, src, dest),
      'unlink': this._onDelete.bind(this, dest)
    })
    next()
  }

  _runWithGlob(next) {
    const rootDir = this.bundler.rootDir
    const pattern = this.src
    const watcher = this.bundler.watcher
    const dest = this.dest
    const globRoot = this.opts.root ? join(rootDir, this.opts.root) : rootDir
    glob(pattern, {}, function(err, files) {
      if (files) {
        files.forEach(function(file) {
          let srcPath = join(rootDir, file)
          if (isDirectory(srcPath)) return
          let destPath = join(dest, relative(globRoot, file))
          copySync(srcPath, destPath)
          watcher.watch(srcPath, {
            'change': this._onChange.bind(this, srcPath, destPath),
            'unlink': this._onDelete.bind(this, destPath),
          })
        }.bind(this))
      } else {
        console.error('No files found for pattern %s', pattern)
      }
      next()
    }.bind(this))

    watcher.watch(pattern, {
      'add': this._onAdd.bind(this)
    })
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
    this.invalidate(dest)
    bundler._schedule({
      run() { copySync(src, dest) },
      toString() {
        return self._descr(src, dest)
      }
    })
  }

  _onDelete(dest) {
    this.invalidate(dest)
  }

  _onAdd(file) {
    if (isDirectory(file)) return
    const rootDir = this.bundler.rootDir
    const watcher = this.bundler.watcher
    const globRoot = join(rootDir, this.opts.root) || rootDir
    const srcPath = file
    const destPath = join(this.dest, relative(globRoot, file))
    this._onChange(srcPath, destPath)
    watcher.watch(srcPath, {
      'change': this._onChange.bind(this, srcPath, destPath),
      'unlink': this._onDelete.bind(this, destPath),
    })
  }

  invalidate(dest) {
    console.info('Removing: ', dest)
    removeSync(dest)
  }

}
