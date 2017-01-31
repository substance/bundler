import * as path from 'path'
import * as fs from 'fs'
import { isAbsolute, writeSync } from '../fileUtils'
import { colors } from '../vendor'
import Action from '../Action'

export default class MinifyCommand {

  constructor(src) {
    if (!/.js$/.exec(src)) throw new Error("'src' must be a path to a '.js' file")
    this.src = src
    this._isWatching = false
  }

  get id() {
    return ['MinifyCommand', this.src].join(' ')
  }

  execute(bundler) {
    let src = this.src
    if (!isAbsolute(src)) src = path.join(bundler.rootDir, src)
    const dest = path.join(path.dirname(src), path.basename(src, '.js')+'.min.js')
    const action = new MinifyAction(src, dest)
    bundler._registerAction(action)
    action.execute(bundler)
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

  execute() {
    console.info(this.id)
    // uglify can not be bundled as it does dynamic file loading
    // and we also don't ship it, thus it is required as late as possible
    const uglify = require('uglify-js-harmony')
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
    console.info(colors.green('..finished in %s ms.'), Date.now()-t0)
  }
}