const fs = require('fs')
const path = require('path')

module.exports = function vfs(b, options={}) {
  const src = options.src
  if (!src) throw new Error("'src' is mandatory")
  const dest = options.dest
  if (!dest) throw new Error("'dest' is mandatory")
  b.custom(`Creating virtual file system: ${dest}`, {
    src: src,
    dest: dest,
    execute(files) {
      const rootDir = b.rootDir
      const vfs = {}
      files.forEach((f) => {
        if (b.isDirectory(f)) return
        let content = fs.readFileSync(f).toString()
        let relPath = path.relative(rootDir, f).replace(/\\/g, '/')
        vfs[relPath] = content
      })
      const code = _generateCode(vfs, options)
      b.writeSync(dest, code)
    }
  })
}

function _generateCode(vfs, {format, moduleName}) {
  const CONTENT = JSON.stringify(vfs, null, 2)
  // NOTE: the following code is run in the browser
  const clazz = `
const CONTENT = ${CONTENT}
const SLASH = '/'.charCodeAt(0)
class SimpleVFS {
  readFileSync(path) {
    if (path.charCodeAt(0) === SLASH) {
      path = path.slice(1)
    }
    if (!CONTENT.hasOwnProperty(path)) {
      throw new Error('File does not exist: '+ path)
    }
    return CONTENT[path]
  }
  existsSync(path) {
    return CONTENT.hasOwnProperty(path)
  }
}
`
  if (!format) throw new Error("'format' is mandatory")
  if (format === 'umd') {
    if (!moduleName) throw new Error("'moduleName' is mandatory")
    return [clazz, `window.${moduleName} = new SimpleVFS()`].join('\n')
  } else if (format === 'es') {
    return [clazz, 'const vfs = new SimpleVFS()', 'export default vfs'].join('\n')
  }
}
