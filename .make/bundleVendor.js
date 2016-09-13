/* eslint-disable semi */
var fs = require('fs');
var path = require('path');
var browserify = require('browserify');
var uglifyjs = require('uglify-js');

module.exports = function bundle_vendor(opts) {
  opts = opts || {}
  var src = "./.make/vendor.js";
  var dest = "./dist/vendor.js";
  return new Promise(function(resolve, reject) {
    browserify(src, {
      insertGlobalVars: {
        'process': undefined,
        'global': undefined,
        '__dirname': "",
        '__filename': "",
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
