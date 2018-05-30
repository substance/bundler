import { acorn, MagicString } from '../vendor'

export default function cleanup (options = {}) {
  const sourceMap = options.sourceMap !== false
  return {
    name: 'cleanup',
    transform: function (code) {
      const magicString = new MagicString(code)
      acorn.parse(code, {
        ecmaVersion: 8,
        sourceType: 'module',
        onComment: function (block, text, start, end) {
          magicString.remove(start, end)
        }
      })
      code = magicString.toString()
      const map = sourceMap ? magicString.generateMap({
        includeContent: true,
        hires: true
      }) : null
      return { code, map }
    }
  }
}
