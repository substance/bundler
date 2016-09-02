// A very dangerous iplementation of nodejs resolve
// using node's private API
export default function resolve(opts) {
  return {
    name: "resolve",
    resolveId: function(importee, importer) {
      if (!importer) return null;
      var parent = require.cache[importer];
      if (!parent) {
        try {
          require(importer);
          parent = require.cache[importer];
        } catch (err) {
          return null;
        }
      }
      try {
        return Module._resolveFilename(importee, parent, false)
      } catch (err) {}
    }
  }
}
