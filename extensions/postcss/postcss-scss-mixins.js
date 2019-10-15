const postcss = require('postcss')

const DEFINE = 'mixin'
const APPLY = 'include'

function insertMixin (result, mixins, rule, processMixins, opts) {
  const name = rule.params.split(/\s/, 1)[0]
  const meta = mixins[name]
  const mixin = meta && meta.mixin
  if (mixin.name === DEFINE) {
    const proxy = postcss.root()
    for (let i = 0; i < mixin.nodes.length; i++) {
      const node = mixin.nodes[i].clone()
      delete node.raws.before
      proxy.append(node)
    }
    processMixins(proxy)
    rule.parent.insertBefore(rule, proxy)
  } else {
    throw new Error('Wrong ' + name + ' mixin type ' + typeof mixin)
  }
  if (rule.parent) rule.remove()
}

function defineMixin (result, mixins, rule) {
  const name = rule.params.split(/\s/, 1)[0]
  mixins[name] = { mixin: rule }
  rule.remove()
}

module.exports = postcss.plugin('postcss-scss-mixins', function (opts) {
  if (typeof opts === 'undefined') opts = { }
  const mixins = { }
  return function processMixins (css, result) {
    css.walkAtRules(function (i) {
      if (i.name === APPLY) {
        insertMixin(result, mixins, i, processMixins, opts)
      } else if (i.name === DEFINE) {
        defineMixin(result, mixins, i)
      }
    })
  }
})
