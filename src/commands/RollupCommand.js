import * as path from 'path'
import {
  glob, rollup, commonjs, alias,
  sourcemaps,
  isArray, isPlainObject, colors, forEach
} from '../vendor'
import { isAbsolute, writeSync } from '../fileUtils'
import ignore from '../rollup/rollup-ignore'
import buble from '../rollup/rollup-plugin-buble'
import uglify from '../rollup/rollup-plugin-uglify'
import istanbulPlugin from '../rollup/rollup-plugin-istanbul'
import cleanup from '../rollup/rollup-plugin-cleanup'
import rollupGlob from '../rollup/rollup-glob'
import jsonPlugin from '../rollup/rollup-plugin-json'
import Action from '../Action'
import log from '../log'

const ZERO = '\0'.charCodeAt(0)

let nodeResolve = require('rollup-plugin-node-resolve')

export default class RollupCommand {
  constructor (src, opts) {
    if (!src) throw new Error("'src' is mandatory.")
    // rollup does not have a good behavior with src being a glob pattern.
    // for that purpose we detect if src contains glob pattern
    // and then use a generated index file as entry
    let srcPattern = null
    if (isArray(src) || glob.hasMagic(src)) {
      srcPattern = src
      src = rollupGlob.ENTRY
    }
    this.src = src

    // we have allowed some target options on the top level
    // so we need to make sure to rename old ones
    _renameLegacyTargetOptions(opts)

    const sourcemap = (opts.sourcemap !== false)

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
        return opts.ignore.indexOf(ext) < 0
      })
    }

    // parse targets
    if (opts.output) {
      this.targets = opts.output
      delete opts.output
    // LEGACY
    } else {
      console.error("DEPRECATED: use 'output:[...]' instead")
      if (opts.targets) {
        this.targets = opts.targets
        delete opts.targets
      } else if (opts.target) {
        this.targets = [opts.target]
        delete opts.target
      } else {
        // all these are actually target specific options
        // but allowed on top-level for convenience
        // however, here we normalize, wrapping this into 'targets'
        const TARGET_OPTS = [
          'dest', 'format', 'name', 'paths',
          'sourcemap', 'sourcemapRoot', 'sourcemapPrefix'
        ]
        let target = {}
        TARGET_OPTS.forEach((name) => {
          if (opts.hasOwnProperty(name)) {
            target[name] = opts[name]
            delete opts[name]
          }
        })
        // HACK: special treatment for globals
        target.globals = globals
        this.targets = [target]
        delete opts.globals
      }
    }
    this.targets.forEach(_renameLegacyTargetOptions)

    let resolveOpts
    // always add node-resolve, only don't if set to false
    if (opts.resolve !== false) {
      resolveOpts = opts.resolve || { main: true, jsnext: true }
    }
    delete opts.resolve

    let aliasOpts = opts.alias || {}
    delete opts.alias

    let ignoreOpts = opts.ignore
    delete opts.ignore

    // commonjs modules
    let cjsOpts
    if (opts.commonjs) {
      if (opts.commonjs === true) {
        // default setting
        cjsOpts = {
          include: ['node_modules/**']
        }
      } else if (isArray(opts.commonjs)) {
        let include = opts.commonjs.map(name => '**/' + name + '/**')
        cjsOpts = { include }
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

    let jsonOpts = opts.json
    delete opts.json

    let istanbulOpts = opts.istanbul
    delete opts.istanbul

    let cleanupOpts = opts.cleanup
    delete opts.cleanup

    let uglifyOpts = opts.minify
    delete opts.minify

    // Plugins

    let plugins = []

    // if the src contains a glob pattern we use rollupGlob to generate the entry
    if (srcPattern) plugins.push(rollupGlob({pattern: srcPattern}))

    if (ignoreOpts) plugins.push(ignore(ignoreOpts))

    if (aliasOpts) plugins.push(alias(aliasOpts))

    // resolve plugin takes care of finding imports in 'node_modules'
    // NOTE: better this be the first and does everything related to resolving
    // i.e., aliases, ignores etc.
    if (resolveOpts) plugins.push(nodeResolve(resolveOpts))

    // this is necesssary so that already existing sourcemaps
    // present in imported files are picked up
    if (sourcemap) plugins.push(sourcemaps())

    // apply instrumentation before any other transforms
    if (istanbulOpts) plugins.push(istanbulPlugin(istanbulOpts))

    // TODO: is it important to add commonjs here or could it be earlier as well?
    // e.g. does it need to be after buble?
    if (cjsOpts) plugins.push(commonjs(cjsOpts))

    // if (nodeGlobalsOpts) plugins.push(nodeGlobals(nodeGlobalsOpts))

    // this turns on basic es6 transpilation
    if (bubleOpts) plugins.push(buble(bubleOpts))

    if (jsonOpts) plugins.push(jsonPlugin(jsonOpts))

    if (uglifyOpts) plugins.push(uglify(uglifyOpts))

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

  get id () {
    return ['RollupCommand', this.src, this.targets.map(function (target) {
      return target.file
    })]
  }

  get name () {
    return 'js'
  }

  execute (bundler) {
    let src = this.src
    // turn src into an absolute path, but only
    // if it does not start with "\0" as it used by rollup-glob.ENTRY
    if (src.charCodeAt(0) !== ZERO && !isAbsolute(src)) src = path.join(bundler.rootDir, src)
    const plugins = this.plugins
    const targets = this.targets
    const opts = this.opts
    const action = new RollupAction(bundler, src, plugins, targets, opts)
    bundler._registerAction(action)
    return action.execute(bundler)
  }
}

class RollupAction extends Action {
  constructor (bundler, src, plugins, targets, opts) {
    super()
    this.bundler = bundler
    this.src = src
    this.plugins = plugins
    this.targets = targets
    this.opts = opts
    this.sourcemap = (opts.sourcemap !== false)
    this.rootDir = bundler.rootDir

    this._cache = null
    this._watched = {}

    this.outputs = this._getOutputs()
  }

  get id () {
    return ['Rollup:', this.src, '->'].concat(this._getBundles().join('|')).join(' ')
  }

  execute (bundler) {
    bundler._info(this.id)
    const t0 = Date.now()
    const cache = this._cache
    const src = this.src
    const targets = this.targets
    const plugins = this.plugins

    let opts = Object.assign({
      input: src,
      plugins: plugins,
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
        return Promise.all(targets.map((target) => {
          return this._generate(bundle, target)
        })).then(() => {
          bundler._info(colors.green('..finished in %s ms.'), Date.now() - t0)
          this._updateWatchers(bundle)
        })
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

  invalidate () {
    Action.removeOutputs(this)
  }

  _generate (bundle, target) {
    const rootDir = this.rootDir
    const absDest = isAbsolute(target.file) ? target.file : path.join(rootDir, target.file)
    let targetOpts = Object.assign({}, target)
    // HACK: do globals really need to go here?
    // maybe we should copy them previously
    if (this.opts.globals) {
      targetOpts.globals = Object.assign({}, this.opts.globals, target.globals)
    }
    if (this.sourcemap) {
      targetOpts.sourcemap = true
      targetOpts.sourcemapFile = absDest
    }
    return bundle.generate(targetOpts)
      .then((result) => {
      // write the map file first so that a file watcher for the bundle
      // is not triggered too early
        if (this.sourcemap) {
          let sourcemap = result.map.toString()
          if (target.sourcemapRoot) {
            let data = JSON.parse(sourcemap)
            data.sources = data.sources.map(function (srcPath) {
              let absSrcPath = path.join(path.dirname(absDest), srcPath)
              let relSrcPath = path.relative(target.sourcemapRoot, absSrcPath)
              relSrcPath = relSrcPath.replace(/\\/g, '/')
              // console.log('### source file:', srcPath)
              // HACK: hard coded pattern for source path transformation
              if (target.sourcemapPrefix) relSrcPath = target.sourcemapPrefix + '/' + relSrcPath
              return relSrcPath
            })
            sourcemap = JSON.stringify(data)
          }
          writeSync(absDest + '.map', sourcemap)
          writeSync(absDest,
            [
              result.code,
              // HACK: buble has troubles with '//' in a string
              '\n', '/', '/# sourceMappingURL=./', path.basename(absDest) + '.map'
            ].join('')
          )
        } else {
          writeSync(absDest, result.code)
        }
      })
  }

  _updateWatchers (bundle) {
    const bundler = this.bundler
    const watcher = bundler.watcher
    const watched = this._watched
    const self = this

    bundle.modules.forEach(function (m) {
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

    function _onChange () {
      _invalidate()
      bundler._schedule(self)
    }

    function _invalidate () {
      self.invalidate()
      self.outputs.forEach(function (file) {
        bundler._invalidate(file)
      })
    }
  }

  _getOutputs () {
    return this._getBundles().concat(this._getSourceMaps())
  }

  _getBundles () {
    const rootDir = this.rootDir
    const targets = this.targets
    return targets.map((target) => {
      return isAbsolute(target.file) ? target.file : path.join(rootDir, target.file)
    })
  }

  _getSourceMaps () {
    const rootDir = this.rootDir
    const targets = this.targets
    return targets.map((target) => {
      if (target.sourcemap === false) return null
      const dest = target.file + '.map'
      return isAbsolute(dest) ? dest : path.join(rootDir, dest)
    }).filter(Boolean)
  }
}

function _renameLegacyTargetOptions (target) {
  // NOTE: with the latest rollup version,
  // some options have been renamed
  // const RENAMED
  const RENAMED = {
    'dest': 'file',
    'moduleName': 'name',
    'sourceMap': 'sourcemap',
    'sourceMapFile': 'sourcemapFile',
    'sourceMapPrefix': 'sourcemapPrefix'
  }
  forEach(RENAMED, (newName, oldName) => {
    if (target.hasOwnProperty(oldName)) {
      console.error(`DEPRECATED: use 'target.${newName}' instead.`)
      target[newName] = target[oldName]
      delete target[oldName]
    }
  })
}
