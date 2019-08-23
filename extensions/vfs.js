const fs = require('fs')
const path = require('path')

/**
 * A bundler extension for creating virtual browser filesystems.
 *
 * @param {Bundler} b
 * @param {object} options
 * @param {string|array<string>} options.src a single file, a glob pattern, or an array of such.
 *    > Note: source files are watched when bundler is run in watch mode
 */
module.exports = function vfsBundlerExtension (b, options = {}) {
  const src = options.src
  if (!src) throw new Error("'src' is mandatory")
  const dest = options.dest
  if (!dest) throw new Error("'dest' is mandatory")
  b.custom(`Creating virtual file system: ${dest}`, {
    src: src,
    dest: dest,
    execute (files) {
      const rootDir = options.rootDir || b.rootDir
      const vfs = {}
      files.forEach((f) => {
        if (b.isDirectory(f)) return
        let content = fs.readFileSync(f).toString()
        let relPath = path.relative(rootDir, f).replace(/\\/g, '/')
        vfs[relPath] = content
      })
      const code = _generateCode(vfs, options)
      b.writeFileSync(dest, code)
    }
  })
}

function _generateCode (vfs, {format, moduleName}) {
  const CONTENT = JSON.stringify(vfs, null, 2)
  // NOTE: the following code is run in the browser
  const clazz = `
const CONTENT = ${CONTENT}
const SLASH = '/'.charCodeAt(0)
class SimpleVFS {

  constructor() {
    this._data = CONTENT
  }

  readFileSync(path) {
    if (path.charCodeAt(0) === SLASH) {
      path = path.slice(1)
    }
    if (!CONTENT.hasOwnProperty(path)) {
      throw new Error('File does not exist: '+ path)
    }
    return CONTENT[path]
  }

  writeFileSync(path, content) {
    if (path.charCodeAt(0) === SLASH) {
      path = path.slice(1)
    }
    CONTENT[path] = content
  }

  existsSync(path) {
    return CONTENT.hasOwnProperty(path)
  }

}
`
  if (!format) throw new Error("'format' is mandatory")
  if (format === 'umd') {
    if (!moduleName) throw new Error("'moduleName' is mandatory")
    return `
(_global => {
${clazz}
_global.${moduleName} = new SimpleVFS()
})(typeof global !== 'undefined' ? global : window)
`
  } else if (format === 'es') {
    return `
${clazz}
export default new SimpleVFS()
`
  }
}
