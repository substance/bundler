const path = require('path')
const fs = require('fs')
const { fileUtils } = require('../dist/bundler')

const TMP = path.join(__dirname, '..', 'tmp')

// Note: these functions all work relative to the 'tmp' folder
function fileExists(f) {
  f = path.join(f)
  return fs.existsSync(f)
}

function writeFileSync(f, content) {
  f = path.join(f)
  fileUtils.writeSync(f, content)
}

function readFileSync(f) {
  f = path.join(f)
  return fs.readFileSync(f, 'utf8')
}

module.exports = {
  fileExists,
  writeFileSync,
  readFileSync
}