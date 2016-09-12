/* eslint-disable semi */
var rollup = require('rollup');
var buble = require('rollup-plugin-buble');

module.exports = function bundle() {
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
      require.resolve('../dist/vendor'),
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
