const fs = require('fs')

module.exports = function bundleVendor (opts) {
  opts = opts || {}
  const src = opts.src
  const dest = opts.dest
  const external = opts.external || []
  return new Promise((resolve, reject) => {
    const browserify = require('browserify')
    const browserified = browserify(src, {
      insertGlobalVars: {
        'process': undefined,
        'global': undefined,
        '__dirname': '',
        '__filename': ''
      },
      browserField: false,
      builtins: false,
      commondir: false,
      fullPaths: false,
      standalone: 'vendor',
      debug: opts.debug
    })
    external.forEach(m => {
      browserified.external(m)
    })
    browserified.bundle((err, buf) => {
      if (err) {
        reject(err)
      } else {
        if (opts.debug) {
          fs.writeFileSync(dest, buf.toString())
        } else {
          var uglifyjs = require('uglify-js')
          var minified = uglifyjs.minify(buf.toString(), {fromString: true})
          fs.writeFileSync(dest, minified.code)
        }
        resolve()
      }
    })
  })
}
