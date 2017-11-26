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

    // for convenience as this is often necessary for web-bundles
    if (opts.moduleName) {
      bOpts.standalone = opts.moduleName
    }
    if (opts.hasOwnProperty('sourceMaps')) {
      bOpts.debug = opts.sourceMaps
    }

    this.options = options
  }

  get id() {
    return ['BrowserifyCommand', this.src, this.dest ].join('')
  }

  get name() {
    return 'browserify'
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

  execute(bundler) {
    bundler._info(this.id)
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
        // TODO: deal with sourceMaps
        if (this.options.exports) {
          let exports = this.options.exports
          code = String(code)

          let lines = code.split(/\r?\n/g)
          // Handling the last line which is either empty or
          let lastLine = lines.pop()
          if (/^\s*$/.exec(lastLine)) {
            // nothing
          } else if(/^\/\/#/.exec(lastLine)) {
            // TODO: do something with the source map
          } else {
            lines.push(lastLine)
          }
          lastLine = lines.pop()
          // HACK: extracting the entry id by extracting a valid expression from the last generated line of code
          // evaluating it in a Function
          // Example: },{}]},{},[1])
          let f = new Function('return [{ "foo": [{'+lastLine.slice(0, -2)+']')
          // console.log('#### ', f.toString())
          let iifeArgs = f()
          let entry = iifeArgs[2][0]
          lines.push([lastLine.slice(0,-1),'(',entry,')'].join(''))
          // generate es6 exports
          code = ['let _exports = '+lines.join('\n')]
          exports.forEach((name) => {
            if (name === 'default') {
              code.push('export default _exports')
            } else {
              code.push('let '+name+' = _exports.'+name)
              code.push('export {'+name+'}')
            }
          })
          code = code.join('\n')
        }
        let absDest = isAbsolute(this.dest) ? this.dest : path.join(this.rootDir, this.dest)
        writeSync(absDest, code)
        bundler._info(colors.green('..finished in %s ms'), Date.now()-t0)
        resolve()
      })
    })
  }

  invalidate() {
    Action.removeOutputs(this)
  }

}
