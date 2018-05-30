import * as path from 'path'
import * as fs from 'fs'
import { isAbsolute, writeSync } from '../fileUtils'
import { colors } from '../vendor'
import Action from '../Action'

export default class MinifyCommand {
  constructor (src, opts = {}) {
    if (!/.js$/.exec(src)) throw new Error("'src' must be a path to a '.js' file")
    this.src = src
    this.opts = opts
    this._isWatching = false
  }

  get id () {
    return ['MinifyCommand', this.src].join(' ')
  }

  get name () {
    return 'minify'
  }

  execute (bundler) {
    let src = this.src
    if (!isAbsolute(src)) src = path.join(bundler.rootDir, src)
    const dest = path.join(path.dirname(src), path.basename(src, '.js') + '.min.js')
    const action = new MinifyAction(src, dest, this.opts)
    bundler._registerAction(action)
    action.execute(bundler)
  }
}

class MinifyAction extends Action {
  constructor (src, dest, opts = {}) {
    super([src], [dest])

    this.src = src
    this.dest = dest
    this.debug = (opts.debug !== false)

    if (this.debug !== false) {
      this.destSourceMap = dest + '.map'
      this.outputs.push(this.destSourceMap)
    }
  }

  get id () {
    return ['Minify:', this.src].join(' ')
  }

  execute (bundler) {
    bundler._info(this.id)
    // uglify can not be bundled as it does dynamic file loading
    // and we also don't ship it, thus it is required as late as possible
    const uglify = require('uglify-es')
    const src = this.src
    const dest = this.dest
    const inSourceMap = src + '.map'
    const code = fs.readFileSync(src, 'utf8')
    const destSourceMap = this.destSourceMap
    let opts = {
      // fromString: true,
    }
    if (this.debug) {
      opts.sourceMap = {
        url: './' + path.basename(destSourceMap)
      }
      if (fs.existsSync(inSourceMap)) {
        let content = fs.readFileSync(inSourceMap, 'utf8')
        opts.sourceMap.content = content
      }
    }
    const t0 = Date.now()
    const result = uglify.minify(code, opts)
    writeSync(dest, result.code)
    if (this.debug) {
      writeSync(destSourceMap, result.map)
    }
    bundler._info(colors.green('..finished in %s ms.'), Date.now() - t0)
  }

  invalidate () {
    Action.removeOutputs(this)
  }
}
