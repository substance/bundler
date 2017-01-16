// we are using an older version of bundler
// to build the bundler
var b = require('substance-bundler')
var bundleVendor = require('./util/bundleVendor')
var path = require('path')

b.task('clean', function() {
  b.rm('./dist')
})

b.task('vendor', function() {
  b.copy('./node_modules/buble/dist/buble.deps.js', './tmp/buble.deps.js')
  b.copy('./node_modules/buble/dist/buble.deps.js.map', './tmp/buble.deps.js.map')
  b.custom('Bundling vendor...', {
    // these are necessary for watch and ensureDir
    src: './.make/vendor.js',
    dest: './dist/vendor.js',
    execute: function() {
      return bundleVendor({
        // ... and these are used for doing the work
        src: './.make/vendor.js',
        dest: './dist/vendor.js',
        external: ['fsevents', 'pkg-resolve'],
        debug: true //argv.debug
      })
    }
  })
  // assets for browser bundles which are loaded dynamically
  b.copy('./node_modules/process-es6/browser.js', './dist/browser/process.js')
  b.js('./node_modules/path-browserify/index.js', {
    target: {
      dest: './dist/browser/path.js',
      format: 'es'
    }
  })
  b.js('./node_modules/stream-browserify/index.js', {
    target: {
      dest: './dist/browser/stream.js',
      format: 'es'
    }
  })
  b.js('./node_modules/events/events.js', {
    target: {
      dest: './dist/browser/events.js',
      format: 'es'
    }
  })
})

b.task('bundler', function() {
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

b.task('default', ['clean', 'vendor', 'bundler'])
