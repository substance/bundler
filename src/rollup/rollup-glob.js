import { glob, isArray } from '../vendor'

const ENTRY = '\0rollup-glob:ENTRY'

export default function rollupGlob(options = {}) {
  let pattern = options.pattern
  if (!pattern) throw new Error("'pattern' is mandatory.")
  return {
    name: "glob",
    resolveId (id) {
      if (id === ENTRY) return ENTRY
    },
    load (id) {
      if (id === ENTRY) {
        let files = []
        if (isArray(pattern)) {
          pattern.forEach((p) => {
            files = files.concat(glob.sync(p))
          })
        } else {
          files = glob.sync(pattern)
        }
        let index = files.map((f) => {
          return `import './${f}'`
        }).join('\n')
        return index
      }
    }
  }
}

rollupGlob.ENTRY = ENTRY