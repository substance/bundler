const EMPTY_ID = "\0ignore:empty.js"
const EMPTY_CODE = "export default {}"

export default function ignore(opts) {
  const ignore = (opts.ignore || [])
  return {
    name: "ignore",
    resolveId: function(importee, importer) { // eslint-disable-line no-unused-vars
      if (importee === EMPTY_ID) return importee
      if (ignore.indexOf(importee) > -1) {
        // console.info('## ignoring module %s', importee)
        return EMPTY_ID
      }
    },
    load: function(id) {
      if (id === EMPTY_ID) {
        return EMPTY_CODE
      }
    }
  }
}
