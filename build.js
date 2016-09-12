/* eslint-disable semi */
var yargs = require('yargs')

var bundle = require('./util/bundle')
var bundleVendor = require('./util/bundle_vendor')

var argv = yargs
  .boolean('v').alias('v', 'vendor').default('v', false)
  .boolean('d').default('d', false)
  .argv;

var p;

if (argv.vendor) {
  p = bundleVendor({ debug: argv.d });
} else {
  p = Promise.resolve();
}

p.then(bundle)
.catch(function(err) {
  if (err.stack) {
    console.error(err.stack);
  } else {
    console.error(err);
  }
});
