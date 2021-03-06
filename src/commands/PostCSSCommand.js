import * as fs from 'fs'
import * as path from 'path'
import {
  postcss, postcssImport,
  postcssVariables, postcssReporter,
  colors, debug
} from '../vendor'
import { isAbsolute, writeSync } from '../fileUtils'
import Action from '../Action'

const log = debug('bundler:postcss')

export default class PostCSSCommand {
  constructor (src, dest, opts) {
    this.src = src
    this.dest = dest
    this.opts = opts || {}
  }

  get id () {
    return ['PostCSSCommand', this.src, this.dest]
  }

  get name () {
    return 'css'
  }

  execute (bundler) {
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
  constructor (bundler, src, dest, opts) {
    super()
    this.bundler = bundler
    this.src = src
    this.dest = dest
    this.opts = opts
    this._watched = {}
  }

  get id () {
    return ['PostCSS:', this.src, '->', this.dest].join('')
  }

  execute (bundler) {
    bundler._info(this.id)
    const t0 = Date.now()
    const src = this.src
    const dest = this.dest
    // const opts = this.opts
    const plugins = this.opts.plugins ? this.opts.plugins.slice() : []
    // allow to deactivate the use of predefined plugins
    // so that can use other import plugins such
    // as postcss-sassy-import, for instance
    if (this.opts.builtins !== false) {
      if (this.opts.import !== false) {
        // make sure that postcss-import is the first one
        plugins.unshift(postcssImport({
          onImport: (files) => {
            log('onImport received files', files[0])
            this._registerWatchers(files.map(file => {
              return { file }
            }))
          }
        }))
      }
      if (this.opts.variables) {
        plugins.push(postcssVariables({
          throwError: true
        }))
      }
      plugins.push(postcssReporter())
    }
    const postcssOpts = {
      from: src,
      to: dest,
      map: { inline: false }
    }
    if (this.opts.parser) {
      postcssOpts.parser = this.opts.parser
    }
    const css = fs.readFileSync(this.src, 'utf8')
    return postcss(plugins)
      .process(css, postcssOpts)
      .then(result => {
        const deps = result.messages.filter(
          message => message.type === 'dependency'
        )
        this._registerWatchers(deps)

        writeSync(dest + '.map', JSON.stringify(result.map))
        writeSync(dest, result.css)
        bundler._info(colors.green('..finished in %s ms.'), Date.now() - t0)
      })
  }

  invalidate () {
    Action.removeOutputs(this)
  }

  _registerWatchers (deps) {
    const bundler = this.bundler
    const watcher = bundler.watcher
    const watched = this._watched
    const self = this

    deps.forEach(dep => {
      let file = dep.file
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

    function _onChange () {
      _invalidate()
      bundler._schedule(self)
    }

    function _invalidate () {
      self.invalidate()
      bundler._invalidate(self.dest)
    }
  }
}
