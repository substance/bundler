import * as path from 'path'
import {
  glob, rollup, commonjs, json,
  sourcemaps, isArray, isPlainObject,
  colors
} from '../vendor'
import { isAbsolute, writeSync } from '../fileUtils'
import resolve from '../rollup/rollup-plugin-resolve'
import buble from '../rollup/rollup-plugin-buble'
import eslintPlugin from '../rollup/rollup-plugin-eslint'
import istanbulPlugin from '../rollup/rollup-plugin-istanbul'
import cleanup from '../rollup/rollup-plugin-cleanup'
import rollupGlob from '../rollup/rollup-glob'
import Action from '../Action'
import log from '../log'

const ZERO = "\0".charCodeAt(0)

export default class RollupCommand {

  constructor(src, opts) {
    if (!src) throw new Error("'src' is mandatory.")
    // rollup does not have a good behavior with src being a glob pattern.
    // for that purpose we detect if src contains glob pattern
    // and then use a generated index file as entry
    let srcPattern = null
    if(isArray(src) || glob.hasMagic(src)) {
      srcPattern = src
      src = rollupGlob.ENTRY
    }
    this.src = src

    // in rollup external and globals are often
    // redundant, thus we added an option to specify
    // externals as object, like you would define globals
    // This of course only makes sense for single-target builds
    // In multi-target builds you should define globals
    // in the target specification.
    let globals = Object.assign({}, opts.globals)
    if (opts.external && isPlainObject(opts.external)) {
      Object.assign(globals, opts.external)
      opts.external = Object.keys(opts.external)
    }

    // NOTE: we must remove all externals which are ignored
    // as we want to give 'ignore' a higher precedence
    // rollup will not ask our resolver if it finds a matching
    // external
    if (opts.ignore && opts.ignore.length > 0 && opts.external) {
      opts.external = opts.external.filter((ext) => {
        return opts.ignore.indexOf(ext)<0
      })
    }

    // parse targets
    if (opts.targets) {
      this.targets = opts.targets
      delete opts.targets
    } else if (opts.target) {
      this.targets = [opts.target]
      delete opts.target
    } else {
      this.targets = [{
        dest: opts.dest,
        format: opts.format,
        globals: globals,
        moduleName: opts.moduleName,
        sourceMapRoot: opts.sourceMapRoot,
        sourceMapPrefix: opts.sourceMapPrefix,
      }]
      delete opts.dest
      delete opts.format
      delete opts.globals
      delete opts.moduleName
      delete opts.sourceMapRoot
      delete opts.sourceMapPrefix
    }

    // we provide a custom resolver, taking care of
    // pretty much all resolving (relative and node)
    let resolveOpts
    if (opts.resolve !== false) {
      resolveOpts = opts.resolve || {}

      if (opts.alias) {
        resolveOpts.alias = Object.assign({}, opts.alias, resolveOpts.alias)
      }
      if (opts.ignore && opts.ignore.length > 0) {
        resolveOpts.ignore = opts.ignore
      }
      delete opts.ignore
      delete opts.alias
    }
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
    }
    delete opts.buble

    let jsonOpts = null
    if (opts.json) {
      jsonOpts = opts.json
    }
    delete opts.json

    let eslintOpts = null
    if (opts.eslint) {
      eslintOpts = opts.eslint
    }
    delete opts.eslint

    let istanbulOpts = null
    if (opts.istanbul) {
      istanbulOpts = opts.istanbul
    }
    delete opts.istanbul

    let cleanupOpts = null
    if (opts.cleanup) {
      cleanupOpts = opts.cleanup
    }
    delete opts.cleanup

    // Plugins

    let plugins = []

    // if the src contains a glob pattern we use rollupGlob to generate the entry
    if (srcPattern) plugins.push(rollupGlob({pattern:srcPattern}))

    // resolve plugin takes care of finding imports in 'node_modules'
    // NOTE: better this be the first and does everything related to resolving
    // i.e., aliases, ignores etc.
    if (resolveOpts) plugins.push(resolve(resolveOpts))

    if (eslintOpts) plugins.push(eslintPlugin(eslintOpts))

    // this is necesssary so that already existing sourcemaps
    // present in imported files are picked up
    if (opts.sourceMap !== false) plugins.push(sourcemaps())

    // apply instrumentation before any other transforms
    if (istanbulOpts) plugins.push(istanbulPlugin(istanbulOpts))

    // TODO: is it important to add commonjs here or could it be earlier as well?
    // e.g. does it need to be after buble?
    if (cjsOpts) plugins.push(commonjs(cjsOpts))

    // if (nodeGlobalsOpts) plugins.push(nodeGlobals(nodeGlobalsOpts))

    // this turns on basic es6 transpilation
    if (bubleOpts) plugins.push(buble(bubleOpts))

    if (jsonOpts) plugins.push(json(jsonOpts))

    // TODO: need to discuss whether and how we want to allow custom rollup plugins
    // The order of plugins is critical in certain cases, thus as we do here, appending to
    // automatically added plugins, might lead to custom plugins not being called
    if (opts.plugins) {
      plugins = plugins.concat(opts.plugins)
    }
    delete opts.plugins

    if (cleanupOpts) {
      plugins.push(cleanup(cleanupOpts))
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

  get name() {
    return 'js'
  }

  execute(bundler) {
    let src = this.src
    // turn src into an absolute path, but only
    // if it does not start with "\0" as it used by rollup-glob.ENTRY
    if (src.charCodeAt(0)!==ZERO && !isAbsolute(src)) src = path.join(bundler.rootDir, src)
    const plugins = this.plugins
    const targets = this.targets
    const opts = this.opts
    const action = new RollupAction(bundler, src, plugins, targets, opts)
    bundler._registerAction(action)
    return action.execute(bundler)
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

  execute(bundler) {
    bundler._info(this.id)
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
        bundler._info(colors.yellow(warning.message))
        bundler._info(colors.grey(warning.url))
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
      bundler._info(colors.green('..finished in %s ms.'), Date.now()-t0)
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
