import * as fs from 'fs'
import * as path from 'path'
import { fse } from './vendor'

export function isDirectory (p) {
  return (fs.existsSync(p) && fs.lstatSync(p).isDirectory())
}

export function isAbsolute(p) {
  return path.resolve(p) === path.normalize(p)
}

export function copySync(src, dest) {
  const dir = _dir(dest)
  fse.ensureDirSync(dir)
  fse.copySync(src, dest)
}

export function writeSync(dest, buf) {
  let dir = _dir(dest)
  fse.ensureDirSync(dir)
  fs.writeFileSync(dest, buf)
}

function _dir(p) {
  if (p[p.length-1] === '/') return p
  else return path.dirname(p)
}
