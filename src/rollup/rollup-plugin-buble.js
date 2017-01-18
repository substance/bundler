import { buble as _buble, pluginutils } from '../vendor'

export default function buble ( options ) {
  if ( !options ) options = {}
  var filter = pluginutils.createFilter( options.include, options.exclude )

  if ( !options.transforms ) options.transforms = {}
  options.transforms.modules = false

  return {
    name: 'buble',

    transform: function ( code, id ) {
      if (!/\.js$/.exec(id)) return null
      if ( !filter( id ) ) return null
      return _buble.transform( code, options )
    }
  }
}
