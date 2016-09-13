/* eslint-disable semi */
var fs = require('fs');

module.exports = function bundleVendor(opts) {
  opts = opts || {}
  var src = opts.src ;
  var dest = opts.dest;
  var external = opts.external || []
  return new Promise(function(resolve, reject) {
    var browserify = require('browserify');
    var b = browserify(src, {
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
    external.forEach(function(m) {
      b.external(m)
    })
    b.bundle(function(err, buf) {
      if(err) {
        reject(err);
      } else {
        if (opts.debug) {
          fs.writeFileSync(dest, buf.toString());
        } else {
          var uglifyjs = require('uglify-js');
          var minified = uglifyjs.minify(buf.toString(), {fromString: true});
          fs.writeFileSync(dest, minified.code);
        }
        resolve();
      }
    });
  });
}
