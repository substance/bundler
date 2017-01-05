import * as path from 'path'
import { pluginutils } from '../vendor'

function normalizePath(id) {
  return path.relative(process.cwd(), id).split(path.sep).join('/')
}

export default function eslintPlugin(eslint, options = {}) {
  if (!eslint) {
    throw new Error('You must pass in a reference to an eslint module')
  }
  const { CLIEngine } = eslint
  if (!CLIEngine) {
    throw new Error('Invalid eslint module.')
  }
  const cli = new CLIEngine()
  let formatter = cli.getFormatter('stylish')

  const filter = pluginutils.createFilter(
    options.include,
    options.exclude || 'node_modules/**'
  )

  return {
    name: 'eslint',

    transform(code, id) {
      const file = normalizePath(id)
      if (cli.isPathIgnored(file) || !filter(id)) {
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