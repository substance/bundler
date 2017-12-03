const { test } = require('substance-test')
const path = require('path')
const setup = require('./setup')
const { fileExists, writeFileSync, readFileSync } = require('./fileHelpers')
const { start } = require('./bundlerHelpers')

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

test('copy: file -> dir', (t) => {
  t.plan(1)
  let { b } = setup()
  let src = 'example/assets/foo.txt'
  let dest = 'tmp/example/assets/'
  b.copy(src, dest)
    .then(() => {
      t.ok(fileExists(path.join(dest, 'foo.txt')), 'output file should exist')
    })
  b._start()
})

test('copy: watch file', (t) => {
  t.plan(1)
  let { b } = setup({ watch: true })
  writeFileSync('tmp/foo.txt', 'foo')
  let src = 'tmp/foo.txt'
  let dest = 'tmp/bar.txt'

  b.copy(src, dest)

  start(b)
    .onceDone()
    .then(() => {
      writeFileSync(src, 'bar')
    }).onceDone(() => {
      let content = readFileSync(dest)
      t.equal(content, 'bar', 'the watched file should have been copied after update')
      b.stop()
    })
})
