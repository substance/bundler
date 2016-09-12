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

  execute(bundler) {
    const rootDir = bundler.rootDir
    let dest = this.dest
    if (!isAbsolute(dest)) dest = path.join(rootDir, dest)
    if (glob.hasMagic(this.src)) {
      this._executeWithGlob(bundler)
    }
    else if (isDirectory(this.src)) {
      this.opts.root = this.src
      this.src = this.src+"/**/*"
      this._executeWithGlob(bundler)
    }
    else {
      this._executeWithoutGlob(bundler)
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
    bundler._registerAction(new CopyAction(src, dest))
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
        bundler._registerAction(new CopyAction(srcPath, destPath))
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
    const globRoot = path.join(rootDir, this.opts.root) || rootDir
    let destPath = path.join(this.dest, path.relative(globRoot, file))
    if (!isAbsolute(destPath)) destPath = path.join(rootDir, destPath)
    bundler._registerAction(new CopyAction(srcPath, destPath))
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

  update() {
    // console.info(this.id)
    copySync(this.src, this.dest)
  }

  invalidate() {
    fse.removeSync(this.dest)
  }

}
