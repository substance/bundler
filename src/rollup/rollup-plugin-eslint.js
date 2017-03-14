import * as path from 'path'
import { pluginutils } from '../vendor'

const DOT = ".".charCodeAt(0)

function normalizePath(id) {
  return path.relative(process.cwd(), id).split(path.sep).join('/')
}

export default function eslintPlugin(options = {}) {
  const { CLIEngine } = require('eslint')
  const cli = new CLIEngine()
  let formatter = cli.getFormatter('stylish')
  const filter = pluginutils.createFilter(
    options.include,
    options.exclude || 'node_modules/**'
  )
  const onlyInProject = (options.onlyInProject !== false)

  return {
    name: 'eslint',

    transform(code, id) {
      const file = normalizePath(id)
      if (cli.isPathIgnored(file) || !filter(id)) {
        return null
      }
      // when using symlinks the default filter does not work as node resolves
      // a path outside of 'node_modules'
      // Typically, only the local source code should be checked, i.e., there should
      // be no '../' at the beginning of the relative path
      if (onlyInProject && file.charCodeAt(0) === DOT && file.charCodeAt(1) === DOT) {
        return null
      }
      const report = cli.executeOnText(code, file)
      if (!report.errorCount && !report.warningCount) {
        return null
      }
      const result = formatter(report.results)
      if (result) {
        console.info(result)
      }
      if (options.throwError) {
        throw Error('Warnings or errors were found')
      }
    }
  }
}