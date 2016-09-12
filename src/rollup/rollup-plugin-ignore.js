export default function ignore(opts) {
  // TODO: maybe we want something more sophisticated
  // than just an exact match
  const ignore = (opts.ignore || [])
  return {
    name: "ignore",
    resolveId: function(importee, importer) {
      for (var i = 0; i < ignore.length; i++) {
        if(ignore[i] === importee) {
          // console.info('.. ignoring module %s', importee)
          return '__empty__'
        }
      }
    },
    load: function(id) {
      if (id === '__empty__') {
        return "export default {}"
      }
    }
  }
}
