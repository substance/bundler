// NOTE: we are using an published version of substance-bundler to build the bundler
var b = require('substance-bundler')
var bundleVendor = require('./util/bundleVendor')
var exec = require('./extensions/exec')
var path = require('path')

b.task('clean', function() {
  b.rm('./dist')
  b.rm('./tmp')
})

b.task('vendor', function() {
  b.copy('./node_modules/buble/dist/buble.deps.js', './tmp/buble.deps.js')
  b.copy('./node_modules/buble/dist/buble.deps.js.map', './tmp/buble.deps.js.map')
  exec(b, 'npm install --ignore-scripts', {
    cwd: path.join(__dirname, 'vendor/rollup/'),
    verbose: true
  })
  exec(b, './node_modules/.bin/rollup -c rollup.config.js', {
    cwd: path.join(__dirname, 'vendor/rollup'),
    verbose: true
  })
  b.custom('Bundling vendor...', {
    src: './vendor/_vendor.js',
    dest: './vendor/vendor.js',
    execute: function() {
      return bundleVendor({
        src: './vendor/_vendor.js',
        dest: './vendor/vendor.js',
        external: ['fsevents', 'pkg-resolve', 'sugarss'],
        debug: true
      })
    }
  })
})

b.task('bundler', function() {
  b.copy('vendor/vendor.js', 'dist/vendor.js')
  b.js('src/main.js', {
    // need buble if we want to minify later
    buble: { include: [ 'src/**' ] },
    // built-ins: i.e. these files will not be processed
    // leaving the corresponding require statements untouched
    external: [
      'assert', 'buffer', 'child_process', 'constants', 'events',
      'fs', 'os', 'path', 'stream', 'tty', 'url', 'util',
      path.join(__dirname, 'dist', 'vendor.js'),
      'eslint'
    ],
    targets: [{
      dest: './dist/bundler.js',
      format: 'cjs'
    }]
  })
})

b.task('default', ['clean', 'bundler'])
