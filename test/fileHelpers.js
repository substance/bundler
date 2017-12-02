const path = require('path')
const fs = require('fs')

const TMP = path.join(__dirname, '..', 'tmp')

// Note: these functions all work relative to the 'tmp' folder
function fileExists(f) {
  f = path.join(f)
  return fs.existsSync(f)
}

module.exports = {
  fileExists
}