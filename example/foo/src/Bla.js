import map from 'lodash/map'

export default class Bla {
  bla() {
    return 'bla'
  }

  blabla() {
    return map({
      a: 'bla',
      b: 'bla'
    }).join('')
  }
}