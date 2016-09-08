import { lstatSync, writeFileSync } from 'fs'
import { dirname, normalize, resolve } from 'path'
import { ensureDirSync, copySync } from './vendor'

export { basename, dirname, join, relative, sep } from 'path'
export { existsSync } from 'fs'
export { removeSync, walk, ensureDirSync, glob } from './vendor'

export function isDirectory (p) {
  return lstatSync(p).isDirectory()
}

export function isAbsolute(p) {
  return resolve(p) === normalize(p)
}

function _copySync(src, dest) {
  const dir = _dir(dest)
  ensureDirSync(dir)
  copySync(src, dest)
}

export { _copySync as copySync }

export function writeSync(dest, buf) {
  let dir = _dir(dest)
  ensureDirSync(dir)
  writeFileSync(dest, buf)
}

function _dir(p) {
  if (p[p.length-1] === '/') return p
  else return dirname(p)
}
