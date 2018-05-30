import * as fs from 'fs'
import * as path from 'path'
import { fse, debug } from './vendor'

const log = debug('fileUtils')

const SLASH = '/'.charCodeAt(0)

export function isDirectory (p) {
  return (fs.existsSync(p) && fs.lstatSync(p).isDirectory())
}

export function isAbsolute (p) {
  // this is broken since node 8
  // return path.resolve(p) === path.normalize(p)
  return path.isAbsolute(p)
}

export function copySync (src, dest) {
  const dir = _dir(dest)
  log(`ensureDirSync(${dir})`)
  fse.ensureDirSync(dir)
  fse.copySync(src, dest)
}

export function writeSync (dest, buf) {
  let dir = _dir(dest)
  fse.ensureDirSync(dir)
  fs.writeFileSync(dest, buf)
}

function _dir (p) {
  if (p.charCodeAt(p.length - 1) === SLASH) return p
  else return path.dirname(p)
}
