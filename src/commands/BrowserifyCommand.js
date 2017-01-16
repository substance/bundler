import * as path from 'path'
import { isAbsolute, writeSync } from '../fileUtils'
import { colors } from '../vendor'
import Action from '../Action'

export default class BrowserifyCommand {

  constructor(src, opts = {}) {
    this.src = src
    if (!this.src) throw new Error("'src' is mandatory")
    this.dest = opts.dest
    if (!this.dest) throw new Error("'dest' is mandatory")

    let options = Object.assign({}, opts)
    let bOpts = Object.assign({}, opts.browserify)
    options.browserify = bOpts

    // interpret options and transfer to browserify options
    if (opts.server) {
      // settings for a bundle that will be executed in nodejs
      // i.e., no replacement of nodejs built-ins necessary
      bOpts.insertGlobalVars = Object.assign({
        'process': undefined,
        'global': undefined,
        '__dirname': "",
        '__filename': "",
      }, bOpts.insertGlobalVars)
      bOpts.browserField = false
      bOpts.builtins = false
      bOpts.commondir = false
      bOpts.fullPaths = false
    }

    this.options = options
  }

  get id() {
    return ['BrowserifyCommand', this.src, this.dest ].join('')
  }

  execute(bundler) {
    let src = this.src
    if (!isAbsolute(src)) src = path.join(bundler.rootDir, src)
    const action = new BrowserifyAction(bundler, src, this.dest, this.options)
    bundler._registerAction(action)
    return action.execute(bundler)
  }

}

class BrowserifyAction extends Action {

  constructor(bundler, src, dest, options = {}) {
    super()

    this.src = src
    this.dest = dest
    this.options = options
    this.rootDir = bundler.rootDir
  }

  get id() {
    return ['Browserify:', this.src, '->', this.dest].join(' ')
  }

  execute() {
    console.info(this.id)
    const options = this.options
    var t0 = Date.now()
    return new Promise((resolve, reject) => {
      // browserify can not be bundled due to dynamic requires
      var browserify = require('browserify')

      // TODO: maybe we need to clone these
      const bOpts = Object.assign({}, options.browserify)
      let b = browserify(this.src, bOpts)
      if (options.external) {
        options.external.forEach((name) => {
          // console.log('### external: ', name)
          b.external(name)
        })
      }
      if (options.ignore) {
        options.ignore.forEach((name) => {
          // console.log('### ignore: ', name)
          b.ignore(name)
        })
      }
      b.bundle((err, code) => {
        if(err) {
          return reject(err)
        }
        // TODO: this only works without sourceMaps
        if (this.options.module) {
          code = String(code)
          let lines = code.split(/\r?\n/g)
          let idx = lines.length-2
          // HACK: extracting the entry id by extracting a valid expression from the last generated line of code
          // evaluating it in a Function
          let f = new Function('return [{ "foo": ['+lines[idx].slice(2, -2)+']')
          // console.log('#### ', f.toString())
          let iifeArgs = f()
          let entry = iifeArgs[2][0]
          lines[idx] = [lines[idx].slice(0,-1),'(',entry,')'].join('')
          code = ['module.exports = ', lines.join('\n')].join('')
        }
        let absDest = isAbsolute(this.dest) ? this.dest : path.join(this.rootDir, this.dest)
        writeSync(absDest, code)
        console.info(colors.green('..finished in %s ms'), Date.now()-t0)
        resolve()
      })
    })
  }
}
