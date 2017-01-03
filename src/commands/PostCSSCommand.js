import * as fs from 'fs'
import * as path from 'path'
import { postcss, postcssImport, postcssVariables } from '../vendor'
import { isAbsolute, writeSync } from '../fileUtils'
import Action from '../Action'

export default class PostCSSCommand {

  constructor(src, dest, opts) {
    this.src = src
    this.dest = dest
    this.opts = opts || {}
  }

  get id() {
    return ['PostCSSCommand', this.src, this.dest]
  }

  execute(bundler) {
    let src = this.src
    let dest = this.dest
    if (!isAbsolute(src)) src = path.join(bundler.rootDir, src)
    if (!isAbsolute(dest)) dest = path.join(bundler.rootDir, dest)
    const action = new PostCSSAction(bundler, src, dest, this.opts)
    bundler._registerAction(action)
    return action.execute(bundler)
  }
}

class PostCSSAction extends Action {

  constructor(bundler, src, dest, opts) {
    super()
    this.bundler = bundler
    this.src = src
    this.dest = dest
    this.opts = opts
    this._watched = {}
  }

  get id() {
    return ['PostCSS:', this.src, '->', this.dest].join('')
  }

  execute() {
    console.info(this.id)
    const t0 = Date.now()
    const src = this.src
    const dest = this.dest
    // const opts = this.opts
    const plugins = [postcssImport({
      onImport: (files) => {
        this._onImport(files)
      }
    })]
    if (this.opts.variables) {
      plugins.push(postcssVariables())
    }

    const css = fs.readFileSync(this.src, 'utf8')
    return postcss(plugins)
    .process(css, {
      from: src,
      to: dest,
      map: { inline: false }
    })
    .then(function (result) {
      writeSync(dest+'.map', JSON.stringify(result.map))
      writeSync(dest, result.css)
      console.info('.. finished in %s ms.', Date.now()-t0)
    })
  }

  _onImport(files) {
    const bundler = this.bundler
    const watcher = bundler.watcher
    const watched = this._watched
    const self = this

    files.forEach(function(file) {
      // skip fake modules which usually do not have a qualified path
      if (!isAbsolute(file)) return
      if (!watched[file]) {
        watcher.watch(file, {
          change: _onChange,
          unlink: _invalidate
        })
        watched[file] = true
      }
    })

    function _onChange() {
      _invalidate()
      bundler._schedule(self)
    }

    function _invalidate() {
      self.invalidate()
      bundler._invalidate(self.dest)
    }
  }
}