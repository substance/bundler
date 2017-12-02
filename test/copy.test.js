const { test } = require('substance-test')
const setup = require('./setup')
const { fileExists } = require('./fileHelpers')

test('copy: file -> file', (t) => {
  t.plan(1)
  let { b } = setup()
  let src = 'example/assets/foo.txt'
  let dest = 'tmp/example/assets/foo.txt'
  b.copy(src, dest)
    .then(() => {
      t.ok(fileExists(dest), 'output file should exist')
    })
  b._start()
})

