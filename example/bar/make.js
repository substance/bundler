let b = require('substance-bundler')

const DIST = 'dist/'

b.js('example2.js', {
  target: {
    dest: DIST + 'example2.js',
    format: 'cjs'
  }
})
