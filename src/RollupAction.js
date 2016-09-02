import { isArray, rollup, buble, commonjs, sourcemaps } from './vendor'
import { basename, isAbsolute, join, writeSync } from './fileUtils'
import ignore from './rollup/rollup-plugin-ignore'
import nodeResolve from './rollup/rollup-plugin-resolve'

export default class RollupAction {

  constructor(bundler, src, targets, opts) {
    opts = Object.assign(bundler.opts['js'] || {}, opts)

    this.bundler = bundler
    this.src = src
    this.targets = targets
    if (!isArray(targets)) {
      this.targets = [targets]
    }
    this.opts = opts

    this.ignore = opts.ignore || []
    this.external = []
    if (opts.external) {
      this.external = opts.external.map(function(ext) {
        return new RegExp("^"+ext)
      })
    }
    this.commonjs = opts.commonjs || []

    this.es6 = opts.es6 || { exclude: 'node_modules/**' }

    this._onChange = this._onChange.bind(this)
    this._watchedFiles = {}
  }

  run(next) {
    const external = this.external
    const t0 = Date.now()
    const cache = {
      modules: this._getCachedModules() || []
    }
    const src = this.src
    const rootDir = this.bundler.rootDir
    const targets = this.targets

    if (this.es6.length > 0) {
      bubleOpts.include = this.es6
    }

    let plugins = [
      sourcemaps()
    ]

    if (this.ignore.length > 0) {
      plugins.push(ignore({ ignore: this.ignore }))
    }

    plugins = plugins.concat([
      buble(this.es6),
      nodeResolve(),
    ]);

    let opts = {
      entry: src,
      plugins: plugins,
      sourceMap: true,
      treeshake: true,
      cache: cache,
      moduleName: 'app'
    }
    if (this.commonjs.length > 0) {
      plugins.push(commonjs({
        include: this.commonjs
      }))
    }
    if (this.external.length > 0) {
      opts.external = function(id) {
        for (var i = 0; i < external.length; i++) {
          if (external[i].exec(id)) {
            // console.log('### external: ', id)
            return true
          }
        }
        return false
      }
    }
    rollup.rollup(opts)
    .then(function(bundle) {
      this._setCachedModules(bundle.modules)
      targets.forEach(function(target) {
        var absDest = isAbsolute(target.dest) ? target.dest : join(rootDir, target.dest)
        var result = bundle.generate({
          format: target.format,
          sourceMap: true,
          sourceMapFile: absDest,
          moduleName: 'app'
        })
        // write the map file first so that a file watcher for the bundle
        // is not triggered too early
        writeSync(absDest+'.map', result.map.toString())
        writeSync(absDest,
          [
            result.code,
            // HACK: buble has troubles with '//' in a string
            "\n","/","/# sourceMappingURL=./",basename(absDest)+".map"
          ].join('')
        )
      })
      console.info('.. finished in %s ms.', Date.now()-t0)
      this._watchFiles(bundle)
      next()
    }.bind(this))
    .catch(next)
  }

  toString() {
    return ['Rollup: ', this.src, ' -> ', this.targets[0].dest].join('')
  }

  _watchFiles(bundle) {
    const watcher = this.bundler.watcher
    bundle.modules.forEach(function(m) {
      const id = m.id
      if (!this._watchedFiles[id]) {
        watcher.watchFile(id, this._onChange)
        this._watchedFiles[id] = true
      }
    }.bind(this))
  }

  _onChange() {
    this.bundler._schedule(this)
  }

  _getCachedModules() {
    const cache = this.bundler.cache[this.src]
    let cachedModules = cache ? cache.modules : []
    return cachedModules || []
  }

  _setCachedModules(modules) {
    let cache = this.bundler.cache[this.src]
    if (!cache) this.bundler.cache[this.src] = cache = {}
    cache.modules = modules
  }
}
