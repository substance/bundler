export default function json() {
  return {
    name: "json",
    transform: function(content, id) {
      if (!/\.(json)$/.exec(id)) return null
      return {
        code: "export default " + content,
        map: { mappings: '' }
      }
    }
  }
}
