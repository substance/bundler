/* eslint-disable semi */
const { createFilter } = require('rollup-pluginutils')
const { createInstrumenter } = require('istanbul-lib-instrument')

module.exports = function rollupPluginIstanbul (options = {}) {
  const filter = createFilter(options.include, options.exclude);
  return {
    transform (code, id) {
      if (!filter(id)) return;

      var instrumenter;
      var sourceMap = Boolean(options.sourceMap);
      var opts = Object.assign({}, options.instrumenterConfig);

      if (sourceMap) {
        opts.codeGenerationOptions = Object.assign({},
          opts.codeGenerationOptions || { format: { compact: !opts.noCompact } },
          { sourceMap: id, sourceMapWithCode: true }
        );
      }

      opts.esModules = true;
      instrumenter = createInstrumenter(opts);

      // console.log('## Running istanbul on', id)
      code = instrumenter.instrumentSync(code, id);

      var map = sourceMap
        ? instrumenter.lastSourceMap().toJSON()
        : { mappings: '' };

      return { code, map };
    }
  }
}
