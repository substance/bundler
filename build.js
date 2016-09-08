/* eslint-disable semi */
var fs = require('fs');
var browserify = require('browserify');
var uglifyjs = require('uglify-js');
var rollup = require('rollup');
var buble = require('rollup-plugin-buble');
var yargs = require('yargs')

var argv = yargs
  .boolean('v').alias('v', 'vendor').default('v', false)
  .argv;

var p;

if (argv.vendor) {
  p = _vendor();
} else {
  p = Promise.resolve();
}

p.then(_bundle)
.catch(function(err) {
  if (err.stack) {
    console.error(err.stack);
  } else {
    console.error(err);
  }
});

function _vendor() {
  console.info('dist/vendor.js...')
  var src = "./vendor.js";
  var dest = "./dist/vendor.js";
  return new Promise(function(resolve, reject) {
    browserify(src, {
      insertGlobalVars: {
        'process': undefined,
        'global': undefined,
      },
      browserField: false,
      builtins: false,
      commondir: false,
      fullPaths: true,
      standalone: 'vendor'
    })
    .external('fsevents')
    .bundle(function(err, buf) {
      if(err) {
        reject(err);
      } else {
        var minified = uglifyjs.minify(buf.toString(), {fromString: true});
        fs.writeFileSync(dest, minified.code);
        resolve();
      }
    });
  });
}

function _bundle() {
  console.info('dist/bundler.js...')
  var dest = 'dist/bundler.js';
  return rollup.rollup({
    entry: 'src/main.js',
    plugins: [
      buble({
        include: [ 'src/**' ]
      }),
    ],
    external: [
      // built-ins
      'assert', 'buffer', 'child_process', 'constants', 'events',
      'fs', 'os', 'path', 'stream', 'tty', 'url', 'util',
      require.resolve('./dist/vendor'),
    ],
    sourceMap: true,
    moduleName: 'bundler',
    // not strict as the vendor bundles contain non-strict code
    useStrict: false
  }).then(function(bundle) {
    return bundle.write({
      dest: dest, format: 'cjs',
      sourceMap: true,
      useStrict: false
    });
  });
}
