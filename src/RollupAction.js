import { rollup, buble, commonjs, sourcemaps } from './vendor'
import { basename, isAbsolute, join, writeSync } from './fileUtils'
import ignore from './rollup/rollup-plugin-ignore'
import nodeResolve from './rollup/rollup-plugin-resolve'

export default class RollupAction {

  constructor(bundler, src, opts) {
    opts = Object.assign({}, bundler.opts['js'], opts)

    this.bundler = bundler
    this.src = src

    if (opts.targets) {
      this.targets = opts.targets
      delete opts.targets
    } else {
      this.targets = [{
        dest: opts.dest,
        format: opts.format,
        moduleName: opts.moduleName,
        sourceMapRoot: opts.sourceMapRoot
      }]
      delete opts.dest
      delete opts.format
      delete opts.moduleName
      delete opts.sourceMapRoot
    }

    let plugins = []
    if (opts.sourceMap !== false) {
      plugins.push(sourcemaps())
    }
    if (opts.buble) {
      plugins.push(buble(opts.buble))
      delete opts.buble
    }
    if (opts.commonjs) {
      plugins.push(commonjs(opts.commonjs))
      delete opts.commonjs
    }
    if (opts.nodeResolve) {
      plugins.push(nodeResolve(opts.nodeResolve))
      delete opts.nodeResolve
    }
    if (opts.ignore && opts.ignore.length > 0) {
      plugins.push(ignore({ ignore: opts.ignore }))
      delete opts.ignore
    }
    opts.globals = opts.globals || []

    this.plugins = plugins


    let _external = opts.external
    if (_external && _external.length > 0) {
      _external = _external.map(function(lib) {
        opts.globals.push(lib)
        return new RegExp("^"+lib)
      })
      opts.external = function(id) {
        for (var i = 0; i < _external.length; i++) {
          if (_external[i].exec(id)) {
            // console.log('### external: ', id)
            return true
          }
        }
        return false
      }
    }

    this.opts = opts

    this._onChange = this._onChange.bind(this)
    this._watchedFiles = {}

    this.cache = null
  }

  run(next) {
    const t0 = Date.now()
    const cache = this.cache
    const src = this.src
    const rootDir = this.bundler.rootDir
    const targets = this.targets
    const plugins = this.plugins

    let opts = Object.assign({
      entry: src,
      plugins: plugins,
      sourceMap: true,
      treeshake: true,
      cache: cache
    }, this.opts)
    rollup.rollup(opts)
    .then(function(bundle) {
      this.cache = bundle
      targets.forEach(function(target) {
        var absDest = isAbsolute(target.dest) ? target.dest : join(rootDir, target.dest)
        var _opts = Object.assign({
          format: target.format,
          sourceMap: true,
          sourceMapFile: absDest,
        }, target)
        var result = bundle.generate(_opts)
        // write the map file first so that a file watcher for the bundle
        // is not triggered too early
        let sourceMap = result.map.toString()
        if (target.sourceMapRoot) {
          let data = JSON.parse(sourceMap)
          data.sources = data.sources.map(function(srcPath) {
            // console.log('### source file:', srcPath)
            // HACK: hard coded pattern for source path transformation
            srcPath = srcPath.replace('..', target.sourceMapRoot)
            return srcPath
          })
          sourceMap = JSON.stringify(data)
        }
        writeSync(absDest+'.map', sourceMap)
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
        watcher.watch(id, {
          change: this._onChange
        })
        this._watchedFiles[id] = true
      }
    }.bind(this))
  }

  _onChange() {
    this.bundler._schedule(this)
  }
}
