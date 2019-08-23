// NOTE: we are using an published version of substance-bundler to build the bundler
const b = require('substance-bundler')
const rollup = require('./extensions/rollup')
const bundleVendor = require('./extensions/_bundleVendor')
const path = require('path')

b.task('clean', () => {
  b.rm('./dist')
  b.rm('./tmp')
})

b.task('vendor', () => {
  b.custom('Bundling vendor...', {
    src: './vendor/_vendor.js',
    dest: './vendor/vendor.js',
    execute: function () {
      return bundleVendor({
        src: './vendor/_vendor.js',
        dest: './vendor/vendor.js',
        external: ['fsevents', 'pkg-resolve', 'sugarss'],
        debug: true
      })
    }
  })
})

b.task('bundler', () => {
  b.copy('vendor/vendor.js', 'dist/vendor.js')
  rollup(b, {
    input: 'src/main.js',
    output: {
      file: './dist/bundler.js',
      format: 'cjs'
    },
    // built-ins: i.e. these files will not be processed
    // leaving the corresponding require statements untouched
    external: [
      'assert', 'buffer', 'child_process', 'constants', 'events',
      'fs', 'os', 'path', 'stream', 'tty', 'url', 'util',
      path.join(__dirname, 'dist', 'vendor.js'),
      'eslint'
    ]
  })
})

b.task('default', ['clean', 'bundler'])
