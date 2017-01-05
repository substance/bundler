import * as path from 'path'
import { rollup, commonjs, json,
         sourcemaps, isArray, isString, isPlainObject,
         colors
       } from '../vendor'
import { isAbsolute, writeSync } from '../fileUtils'
import ignore from '../rollup/rollup-plugin-ignore'
import resolve from '../rollup/rollup-plugin-resolve'
import buble from '../rollup/rollup-plugin-buble'
import eslintPlugin from '../rollup/rollup-plugin-eslint'
import Action from '../Action'
import log from '../log'

export default class RollupCommand {

  constructor(src, opts) {
    this.src = src

    // parse targets
    if (opts.targets) {
      this.targets = opts.targets
      delete opts.targets
    } else if (opts.target) {
      this.targets = [opts.target]
      delete opts.target
    } else {
      console.warn('DEPRECATED: use { target: {...} } instead.')
      this.targets = [{
        dest: opts.dest,
        format: opts.format,
        moduleName: opts.moduleName,
        sourceMapRoot: opts.sourceMapRoot,
        sourceMapPrefix: opts.sourceMapPrefix,
      }]
      delete opts.dest
      delete opts.format
      delete opts.moduleName
      delete opts.sourceMapRoot
      delete opts.sourceMapPrefix
    }

    let ignoreOpts = null
    if (opts.ignore && opts.ignore.length > 0) {
      ignoreOpts = { ignore: opts.ignore }
      delete opts.ignore
    }

    // externals: modules which are not bundled
    const res = _compileExternals(opts.external)
    opts.external = res.external
    opts.globals = Object.assign(res.globals, opts.globals || {})

    // we provide a custom resolver, taking care of
    // pretty much all resolving (relative and node)
    let resolveOpts = opts.resolve || {}
    delete opts.resolve

    // commonjs modules
    let cjsOpts = null
    if (opts.commonjs) {
      cjsOpts = { include: [] }
      if (isArray(opts.commonjs)) {
        resolveOpts.cjs = resolveOpts.cjs || []
        resolveOpts.cjs = resolveOpts.cjs.concat(opts.commonjs)
        opts.commonjs.forEach((name) => {
          cjsOpts.include.push('**/'+name+'/**')
        })
      } else if (isPlainObject(opts.commonjs)) {
        cjsOpts = opts.commonjs
      }
    }
    delete opts.commonjs

    let bubleOpts = null
    if (opts.buble) {
      bubleOpts = Object.assign({}, opts.buble)
      delete opts.buble
    }

    let jsonOpts = null
    if (opts.json) {
      jsonOpts = opts.json
      delete opts.json
    }

    let eslint = null
    if (opts.eslint) {
      eslint = opts.eslint
      delete opts.eslint
    }

    // Plugins

    let plugins = []
    // ignore must be the first, so that no other
    // plugin resolves ignored files
    if (ignoreOpts) plugins.push(ignore(ignoreOpts))

    // resolve plugin takes care of finding imports in 'node_modules'
    if (resolveOpts) plugins.push(resolve(resolveOpts))

    // this is necesssary so that already existing sourcemaps
    // present in imported files are picked up
    if (opts.sourceMap !== false) plugins.push(sourcemaps())

    // this turns on basic es6 transpilation
    if (bubleOpts) plugins.push(buble(bubleOpts))

    // TODO: is it important to add commonjs here or could it be earlier as well?
    // e.g. does it need to be after buble?
    if (cjsOpts) plugins.push(commonjs(cjsOpts))

    if (jsonOpts) plugins.push(json(jsonOpts))

    if (eslint) plugins.push(eslintPlugin(eslint))

    // TODO: need to discuss whether and how we want to allow custom rollup plugins
    // The order of plugins is critical in certain cases, thus as we do here, appending to
    // automatically added plugins, might lead to custom plugins not being called
    if (opts.plugins) {
      plugins = plugins.concat(opts.plugins)
      delete opts.plugins
    }

    this.plugins = plugins

    this.opts = opts
    this.cache = null
  }

  get id() {
    return ['RollupCommand', this.src, this.targets.map(function(target) {
      return target.dest
    })]
  }

  execute(bundler) {
    let src = this.src
    if (!isAbsolute(src)) src = path.join(bundler.rootDir, src)
    const plugins = this.plugins
    const targets = this.targets
    const opts = this.opts
    const action = new RollupAction(bundler, src, plugins, targets, opts)
    bundler._registerAction(action)
    return action.execute(bundler)
  }
}

function _compileExternals(externals) {
  if (!externals || externals.length === 0) {
    return {
      globals: {},
      external: null
    }
  }
  let globals = {}
  externals = externals.map(function(f) {
    if (!isString(f)) {
      globals[f.path] = f.global
      f = f.path
    } else {
      // globals[f] = f
    }
    if (!isAbsolute(f)) {
      return new RegExp("^"+f)
    } else {
      return f
    }
  })
  return {
    external: function(id) {
      for (var i = 0; i < externals.length; i++) {
        const e = externals[i]
        if (isString(e)) {
          if (id === e) {
            return true
          }
        } else if (e.exec(id)) {
          return true
        }
      }
      return false
    },
    globals: globals
  }
}


class RollupAction extends Action {

  constructor(bundler, src, plugins, targets, opts) {
    super()
    this.bundler = bundler
    this.src = src
    this.plugins = plugins
    this.targets = targets
    this.opts = opts
    this.rootDir = bundler.rootDir

    this._cache = null
    this._watched = {}

    this.outputs = this._getOutputs()
  }

  get id() {
    return ['Rollup:', this.src, '->'].concat(this._getBundles().join('|')).join(' ')
  }

  execute() {
    console.info(this.id)
    const t0 = Date.now()
    const cache = this._cache
    const src = this.src
    const rootDir = this.rootDir
    const targets = this.targets
    const plugins = this.plugins

    let opts = Object.assign({
      entry: src,
      plugins: plugins,
      sourceMap: true,
      treeshake: true,
      cache: cache,
      onwarn: (warning) => {
        console.info(colors.yellow(warning.message))
        console.info(colors.grey(warning.url))
      }
    }, this.opts)

    log('RollupAction: starting rollup...')
    return rollup.rollup(opts)
    .then((bundle) => {
      log('RollupAction: received bundle...')
      this.cache = bundle
      log('RollupAction: generating targets...')
      targets.forEach(function(target) {
        var absDest = isAbsolute(target.dest) ? target.dest : path.join(rootDir, target.dest)
        var _opts = Object.assign({
          format: target.format,
          sourceMap: true,
          sourceMapFile: absDest,
          globals: opts.globals
        }, target)
        var result = bundle.generate(_opts)
        // write the map file first so that a file watcher for the bundle
        // is not triggered too early
        let sourceMap = result.map.toString()
        if (target.sourceMapRoot) {
          let data = JSON.parse(sourceMap)
          data.sources = data.sources.map(function(srcPath) {
            let absSrcPath = path.join(path.dirname(absDest), srcPath)
            let relSrcPath = path.relative(target.sourceMapRoot, absSrcPath)
            relSrcPath = relSrcPath.replace(/\\/g, "/")
            // console.log('### source file:', srcPath)
            // HACK: hard coded pattern for source path transformation
            if (target.sourceMapPrefix) relSrcPath = target.sourceMapPrefix + '/' + relSrcPath
            return relSrcPath
          })
          sourceMap = JSON.stringify(data)
        }
        writeSync(absDest+'.map', sourceMap)
        writeSync(absDest,
          [
            result.code,
            // HACK: buble has troubles with '//' in a string
            "\n","/","/# sourceMappingURL=./", path.basename(absDest)+".map"
          ].join('')
        )
      })
      console.info(colors.green('.. finished in %s ms.'), Date.now()-t0)
      this._updateWatchers(bundle)
    })
    .catch((err) => {
      if (err.loc) {
        console.error(colors.red('Rollup failed with %s in %s, line %2, column %s'), err.code, err.loc.file, err.loc.line, err.loc.column)
      } else {
        console.error(colors.red('Rollup failed with %s'), err.code, err)
      }
      if (err.frame) {
        console.error(colors.grey(err.frame))
      }
      throw err
    })
  }

  _updateWatchers(bundle) {
    const bundler = this.bundler
    const watcher = bundler.watcher
    const watched = this._watched
    const self = this

    bundle.modules.forEach(function(m) {
      const file = m.id
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
      self.outputs.forEach(function(file) {
        bundler._invalidate(file)
      })
    }
  }

  _getOutputs() {
    return this._getBundles().concat(this._getSourceMaps())
  }

  _getBundles() {
    const rootDir = this.rootDir
    const targets = this.targets
    return targets.map(function(target) {
      return isAbsolute(target.dest) ? target.dest : path.join(rootDir, target.dest)
    })
  }

  _getSourceMaps() {
    const rootDir = this.rootDir
    const targets = this.targets
    return targets.map(function(target) {
      if (target.sourceMap === false) return null
      const dest = target.dest + ".map"
      return isAbsolute(dest) ? dest : path.join(rootDir, dest)
    }).filter(Boolean)
  }
}
