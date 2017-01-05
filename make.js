// we are using an older version of bundler
// to build the bundler
var b = require('substance-bundler')
var bundleVendor = require('./util/bundleVendor')
var path = require('path')

b.task('clean', function() {
  b.rm('./dist')
})

b.task('vendor', function() {
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
      path.join(__dirname, 'dist', 'vendor.js')
    ],
    sourceMap: true,
    targets: [{
      dest: './dist/bundler.js',
      format: 'cjs'
    }]
  })
})

b.task('default', ['clean', 'vendor', 'bundler'])
