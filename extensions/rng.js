const path = require('path')
const fs = require('fs')

module.exports = function compileRngSchema(b, src, options = {}) {
  const dir = options.dir || 'tmp'
  const name = options.name || path.basename(src, '.rng')
  const dest = `${dir}/${name}.data.js`
  // const issues = `${dir}/${name}.issues.txt`
  const doc = `${dir}/${name}.schema.md`
  const entry = path.basename(src)
  let RNG_SEARCH_DIRS = [path.dirname(src)]
  if (options.RNG_SEARCH_DIRS) {
    RNG_SEARCH_DIRS = RNG_SEARCH_DIRS.concat(options.RNG_SEARCH_DIRS)
  }
  b.custom(`Compiling schema '${name}'...`, {
    src: src,
    dest: dest,
    execute() {
      const { compileRNG, checkSchema } = require('substance')
      const xmlSchema = compileRNG(fs, RNG_SEARCH_DIRS, entry)
      const data = xmlSchema.toJSON()
      b.writeFileSync(dest, `export default ${JSON.stringify(data)}`)
      if (options.doc) {
        b.writeFileSync(doc, xmlSchema.toMD())
      }
      if (options.debug) {
        const issues = checkSchema(xmlSchema)
        const issuesData = [`${issues.length} issues:`, ''].concat(issues).join('\n')
        b.writeFileSync(issues, issuesData)
      }
    }
  })
}
