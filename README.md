# Substance Bundler

This is our custom bundling library, which is similar to gulp or grunt, but more like a shell script or make file.
All operations support file watching (using chokidar).
We use it as a high-level bundling tool, in combination with webpack, rollup, and postcss.

# API

```
const b = require('substance-bundler')
```

## `b.copy(src, dest, options)`

Copy a file or directory to a destination folder. `src` allows for glob patterns.
The destination directory is created if it does not exist.

Copy a single file into dist folder:
```
copy('./foo.js', 'dist/')
```

Copy a single file with renaming
```
copy('./foo.js', 'dist/bar.js')
```

Copy a whole directory into dist folder
```
copy('./assets', 'dist/')
```

Copy a whole directory into dist folder with renaming
```
copy('./node_modules/substance/dist', 'dist/lib/substance')
```

Copy using a glob pattern
```
copy('./node_modules/substance/dist/**\u2063/*.css', 'dist/styles/', { root: './node_modules/substance/dist/'})
```

## `b.rm(path)`

Remove a file or directory, essentially like `rm -rf`.

```
b.rm('dist')
b.rm('tmp')
```

## `b.custom(descr, { src, [dest], execute })`

Perform a custom action.
- `src` can be a single path or a glob pattern, or an array of such.
  Source files are watched for changes.
- `dest` is optional and enables the `bundler` to propagate changes, e.g. removing generated files.
- `execute(files, api)` is called initially and whenever the source files have changed

Example:
```
b.custom('Create version file', {
  src: 'package.json',
  dest: 'VERSION',
  execute (file, api) {
    let pkg = require('./package.json')
    api.writeFileSync('VERSION', pkg.version)
  }
})
```

The first argument, `files`, of the `execute()` handler is particularly useful, if glob patterns are used.
The second argument, `api`, provides the following methods:
- `watch(path)`: adds a watcher for a given file path
- `isAbsolute(path)`: helper to check if a path is absolute or relative
- `isDirectory(path)`: helper to check if a path is a directory
- `copySync(src, dest)`: copy a file or directory (see `b.cp()`)
- `mkdirSync(dir)`: create a directory
- `rmSync(path)`: deletes recursively like `rm -rf`
- `writeFileSync(path, data)`: write data to a file (destination dir is created automatically)

# Extensions

Extensions make use of custom commands.

## rollup

```
const b = require('substance-bundler')
const rollup = require('substance-bundler/extensions/rollup')

rollup(b, require('./rollup.config'))
```

> See [rollup documentation](https://rollupjs.org/guide/en/#big-list-of-options)

## webpack

```
const b = require('substance-bundler')
const webpack = require('substance-bundler/extensions/webpack')

webpack(b, require('./webpack.config'))
```

> See [webpack documentation](https://webpack.js.org/configuration/)

## postcss

```
const b = require('substance-bundler')
const postcss = require('substance-bundler/extensions/postcss')

postcss(b, {
  from: 'substance.css',
  to: 'dist/substance.css'
})
```

> See [postcss documentation](http://api.postcss.org/global.html#processOptions)

Bundler comes with a bundled postcss and predefined set of plugins (`@import` and reporter).
Both can be overridden:
```
postcss(b, {
  from: 'substance.css',
  to: 'dist/substance.css',
  postcss,
  plugins: [...]
})
```

## exec

Execute a program using node's `child_process` module, `cp.spawn()`.

```
const b = require('substance-bundler')
const exec = require('substance-bundler/extensions/exec')

exec(b, command, args, [options])
```
`options`
  - `silent`: no output to stdout or stderr
  - `verbose`: show output to stdout as well to stderr (default is only to stderr)
  - options for `cp.spawn()`: see [child_process documentation](https://nodejs.org/api/child_process.html#child_process_child_process_spawn_command_args_options)

## fork

Same as exec but using `cp.fork()`

