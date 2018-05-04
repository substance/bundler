const EMPTY_ID = "\0ignore:empty.js"
const EMPTY_CODE = "export default {}"

export default function ignore(opts) {
  let keys = opts || []
  function _shouldIgnore(importee) {
    for (let i = 0; i < keys.length; i++) {
      let key = keys[i]
      if (importee && importee.startsWith(key)) return true
    }
    return false
  }
  return {
    name: "resolve",
    resolveId: function resolveId(importee) {
      if (_shouldIgnore(importee)) {
        return EMPTY_ID
      }
      return null
    },
    load: function(id) {
      if (id === EMPTY_ID) {
        return EMPTY_CODE
      }
    }
  }
}