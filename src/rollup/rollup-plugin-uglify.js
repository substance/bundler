export default function uglify(opts) {
  let minifier = opts.minifier || require("uglify-es").minify
  const options = Object.assign({ sourceMap: true }, opts);

  return {
    name: "uglify",

    transformBundle(code) {
      const result = minifier(code, options)
      if (result.error) {
        throw result.error
      }
      return result
    }
  }
}
