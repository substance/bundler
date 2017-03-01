import * as path from 'path'
import * as fs from 'fs'
import Action from '../Action'
import { glob, fse } from '../vendor'
import { copySync, isAbsolute, isDirectory } from '../fileUtils'

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
    copy('./node_modules/substance/packages/** /*.css', 'dist/styles/', { root: './node_modules/substance/'})
  ```
*/

export default class CopyCommand {

  constructor(src, dest, opts) {
    this.src = src
    this.dest = dest
    this.opts = opts || {}
  }

  get id() {
    return ['CopyCommand', this.src, '->', this.dest].join(' ')
  }

  get name() {
    return 'copy'
  }

  execute(bundler) {
    console.info('Copy:', this.src, '->', this.dest)
    const rootDir = bundler.rootDir
    let dest = this.dest
    if (!isAbsolute(dest)) dest = path.join(rootDir, dest)
    if (glob.hasMagic(this.src)) {
      // use the parent of the first * as relative root
      // for paths found via glob
      if (!this.opts.root) {
        let idx = this.src.indexOf('*')
        let pre = this.src.slice(0, idx)
        this.opts.root = path.dirname(pre)
      }
      return this._executeWithGlob(bundler)
    }
    else if (isDirectory(this.src)) {
      this.opts.root = this.src
      this.src = this.src+"/**/*"
      return this._executeWithGlob(bundler)
    }
    else {
      return this._executeWithoutGlob(bundler)
    }
  }

  _executeWithoutGlob(bundler) {
    const rootDir = bundler.rootDir
    let dest = this.dest
    let src = this.src
    if (!isAbsolute(src)) src = path.join(rootDir, src)
    if (!isAbsolute(dest)) dest = path.join(rootDir, dest)
    const lastIsSlash = (dest[dest.length-1] === path.sep)
    if (lastIsSlash || isDirectory(dest)) dest = path.join(dest, path.basename(src))
    // console.log('####', dest, isAbsolute(dest), dest[dest.length-1], path.sep, lastIsSlash, path.basename(src))
    const action = new CopyAction(src, dest)
    bundler._registerAction(action)
    action._execute()
  }

  _executeWithGlob(bundler) {
    const rootDir = bundler.rootDir
    const watcher = bundler.watcher
    const pattern = this.src
    let dest = this.dest
    if (!isAbsolute(dest)) dest = path.join(rootDir, dest)
    const globRoot = this.opts.root ? path.join(rootDir, this.opts.root) : rootDir
    const files = glob.sync(pattern, {})
    if (files) {
      files.forEach(function(file) {
        let srcPath = path.join(rootDir, file)
        if (isDirectory(srcPath)) return
        let destPath = path.join(dest, path.relative(globRoot, file))
        const action = new CopyAction(srcPath, destPath)
        bundler._registerAction(action)
        action._execute()
      })
    } else {
      console.error('No files found for pattern %s', pattern)
    }

    // add a watcher that is used to register actions
    // for added files
    watcher.watch(pattern, {
      'add': this._onAdd.bind(this, bundler)
    })
  }

  /*
    When used with a glob pattern this gets called
    when a new file has been added
  */
  _onAdd(bundler, file) {
    if (isDirectory(file)) return
    const rootDir = bundler.rootDir
    let srcPath = file
    if (!isAbsolute(srcPath)) srcPath = path.join(rootDir, srcPath)
    if (!fs.existsSync(srcPath)) return
    const globRoot = this.opts.root ? path.join(rootDir, this.opts.root) : rootDir
    let destPath = path.join(this.dest, path.relative(globRoot, file))
    if (!isAbsolute(destPath)) destPath = path.join(rootDir, destPath)
    const action = new CopyAction(srcPath, destPath)
    bundler._registerAction(action)
    bundler._schedule(action)
  }
}

class CopyAction extends Action {

  constructor(src, dest) {
    super([src], [dest])

    if (!isAbsolute(src)) {
      throw new Error('Only absolute paths are allowed. Was ' + src)
    }
    if (!isAbsolute(dest)) {
      throw new Error('Only absolute paths are allowed. Was ' + dest)
    }
    // use real paths so that we do not register copy actions
    // for the same file twice (~ in presence of sym links)
    src = fs.realpathSync(src)

    this.src = src
    this.dest = dest
  }

  get id() {
    return ['Copy:',this.src,'->',this.dest].join(' ')
  }

  execute() {
    console.info(this.id)
    this._execute()
  }

  invalidate() {
    fse.removeSync(this.dest)
  }

  _execute() {
    if (fs.existsSync(this.src)) {
      copySync(this.src, this.dest)
    }
  }
}
