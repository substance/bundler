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
  let cmd = 'npm'
  let opts = {
    cwd: path.join(__dirname, 'vendor', 'istanbul'),
    verbose: true,
    shell: true
  }
  exec(b, cmd, 'install', '--ignore-scripts', opts)
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
  b.js('src/index.js', {
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
