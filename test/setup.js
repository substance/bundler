const { Bundler } = require('../dist/bundler')
const { fse } = require('../dist/vendor')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const TMP = path.join(ROOT, 'tmp')

module.exports = function setup() {
  let b = new Bundler({
    rootDir: ROOT
  })
  // delete tmp on every setup
  fse.removeSync(TMP)
  return { b }
}
