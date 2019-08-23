module.exports = function isPlainObject (o) {
  return Boolean(o) && o.constructor === {}.constructor
}