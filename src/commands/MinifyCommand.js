import * as path from 'path'
import * as fs from 'fs'
import { isAbsolute, writeSync } from '../fileUtils'
import Action from '../Action'

// uglify can not be bundled as it does dynamic file loading
const uglify = require('uglify-js')

export default class MinifyCommand {

  constructor(src) {
    if (!/.js$/.exec(src)) throw new Error("'src' must be a path to a '.js' file")
    this.src = src
    this._isWatching = false
  }

  execute(bundler) {
    let src = this.src
    if (!isAbsolute(src)) src = path.join(bundler.rootDir, src)
    const dest = path.join(path.dirname(src), path.basename(src, '.js')+'.min.js')
    bundler._registerAction(new MinifyAction(src, dest))
  }
}

class MinifyAction extends Action {

  constructor(src, dest) {
    super([src], [dest])

    this.src = src
    this.dest = dest
    this.destSourceMap = dest+'.map'

    this.outputs.push(this.destSourceMap)
  }

  get id() {
    return ['Minify:', this.src].join(' ')
  }

  update(next) {
    const src = this.src
    const dest = this.dest
    const inSourceMap = src + '.map'
    const destSourceMap = this.destSourceMap
    const code = fs.readFileSync(src, 'utf8')
    let opts = {
      fromString: true,
      outSourceMap: destSourceMap,
      sourceMapUrl: './'+path.basename(destSourceMap)
    }
    if (fs.existsSync(inSourceMap)) {
      opts.inSourceMap = inSourceMap
    }
    const t0 = Date.now()
    const result = uglify.minify(code, opts)
    writeSync(dest, result.code)
    writeSync(destSourceMap, result.map)
    console.info('.. finished in %s ms.', Date.now()-t0)
    next()
  }
}