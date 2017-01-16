import { inject as injectPlugin } from '../vendor'

function _nodeGlobalsId(name) {
  return "\0node-globals:"+name
}

const GLOBAL_ID = _nodeGlobalsId('global')
const GLOBAL_CODE = `
export default typeof global !== 'undefined' ? global :
            typeof self !== 'undefined' ? self :
            typeof window !== 'undefined' ? window : {}
`

const FS_ID = _nodeGlobalsId('fs')
const FS_CODE = `
export default var fs = {}
`

// browser shims for node globals (fs, process, etc.)
export default function nodeGlobals() {

  const injectOpts = {
    "global": GLOBAL_ID,
    "fs": FS_ID,
    // these are bundled in the dist folder, and included in the bundle dynamically
    "events": require.resolve('./browser/events.js'),
    "path": require.resolve('./browser/path.js'),
    "process": require.resolve('./browser/process.js'),
    "stream": require.resolve('./browser/stream.js'),
  }
  const inject = injectPlugin(injectOpts)

  return {
    name: "node-globals",
    // load(id) {
    //   switch(id) {
    //     case GLOBAL_ID:
    //       return GLOBAL_CODE
    //     case FS_ID:
    //       return FS_CODE
    //     default:
    //       //
    //   }
    // },
    // transform(code, id) {
    //   if (!code) return null
    //   // TODO: the official rollup plugin does a regex check here first and only
    //   // delegate to inject if necessary
    //   return inject.transform(code, id)
    // }
  }
}

