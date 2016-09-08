import { uglify } from './vendor'
import {
  basename, dirname, existsSync, isAbsolute, join,
  relative, writeSync
} from './fileUtils'

export default class MinifyAction {

  constructor(bundler, src) {
    if (!/.js$/.exec(src)) {
      throw new Error("'src' must be a path to a '.js' file")
    }
    this.bundler = bundler
    this.src = src
    this._isWatching = false
  }

  run() {
    const bundler = this.bundler
    const watcher = bundler.watcher
    const rootDir = bundler.rootDir
    const src = this.src
    const inSourceMap = src + '.map'
    const dest = join(dirname(src), basename(src, '.js')+'.min.js')
    const destSourceMap = dest + '.map'

    let opts = {
      outSourceMap: destSourceMap,
      sourceMapUrl: './'+basename(destSourceMap)
    }
    if (existsSync(inSourceMap)) {
      opts.inSourceMap = inSourceMap
    }
    const t0 = Date.now()
    const result = uglifyJS.minify(src, opts)
    writeSync(dest, result.code)
    writeSync(destSourceMap, result.map)

    console.info('.. finished in %s ms.', Date.now()-t0)

    if (!this._isWatching) {
      this._isWatching = true
      const absPath = isAbsolute(src) ? src : join(rootDir, src)
      // console.log('### MinifyAction starts watching', absPath)
      watcher.watch(absPath, {
        change: this._onChange.bind(this)
      })
    }
  }

  toString() {
    const bundler = this.bundler
    return "Uglify: " + relative(bundler.rootDir, this.src)
  }

  _onChange() {
    // console.log('### MinifyAction received "change"')
    this.bundler._schedule(this)
  }
}
