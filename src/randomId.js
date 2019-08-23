export default function randomId () {
  const length = 8
  const ts = Date.now().toString()
  const parts = ts.split('').reverse()
  const id = new Array(length)
  for (let i = length - 1; i >= 0; i--) {
    id[i] = _getRandomInt(0, parts.length - 1)
  }
  return id.join('')
}

function _getRandomInt (min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}
