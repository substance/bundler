let b = require('substance-bundler')

const DIST = 'dist/'

// CommonJS library

b.js('./index.es6.js', {
  commonjs: ['lodash'],
  target: {
    dest: DIST +'foo.cjs.js',
    format: 'cjs'
  }
})

// ES6 library

b.js('./index.es6.js', {
  commonjs: ['lodash'],
  target: {
    dest: DIST + 'foo.es6.js',
    format: 'es'
  }
})

// Browser bundle

