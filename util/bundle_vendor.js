/* eslint-disable semi */
var fs = require('fs');
var path = require('path');
var browserify = require('browserify');
var uglifyjs = require('uglify-js');

module.exports = function bundle_vendor(opts) {
  opts = opts || {}
  console.info('dist/vendor.js...')
  var src = "./vendor.js";
  var dest = "./dist/vendor.js";
  return new Promise(function(resolve, reject) {
    _fixUglifyjsConfig()
    browserify(src, {
      insertGlobalVars: {
        'process': undefined,
        'global': undefined,
      },
      browserField: false,
      builtins: false,
      commondir: false,
      fullPaths: false,
      standalone: 'vendor'
    })
    .external('fsevents')
    .bundle(function(err, buf) {
      if(err) {
        reject(err);
      } else {
        if (opts.debug) {
          fs.writeFileSync(dest, buf.toString());
        } else {
          var minified = uglifyjs.minify(buf.toString(), {fromString: true});
          fs.writeFileSync(dest, minified.code);
        }
        resolve();
      }
    });
  });
}


function _fixUglifyjsConfig() {
  var p = path.join(__dirname, '..', 'node_modules', 'uglify-js', 'package.json')
  var config = JSON.parse(fs.readFileSync(p, 'utf8'));
  delete config.browserify;
  fs.writeFileSync(p, JSON.stringify(config))
}
