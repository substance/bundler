// we are using an older version of bundler
// to build the bundler
var b = require('substance-bundler')
var bundleVendor = require('./.make/bundleVendor')
var path = require('path')

var argv = b.yargs
  .boolean('d').alias('d', 'debug').default('d', false)
  .argv

b.task('clean', function() {
  b.rm('./dist')
})

b.task('vendor', function() {
  b.custom('Bundling vendor...', {
    src: './.make/vendor.js',
    dest: './dist/vendor.js',
    execute: function() {
      return bundleVendor({
        debug: argv.debug
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
      format: 'cjs', moduleName: 'bundler'
    }]
  })
})

b.task('default', [/*'clean',*/ 'vendor', 'bundler'])
