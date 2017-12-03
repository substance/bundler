function start(b) {
  let _p = Promise.resolve()
  const dsl = {
    onceDone,
    then
  }
  b.start()

  return dsl

  function _call(h, args, resolve, reject) {
    if (h) {
      try {
        resolve(h(...args))
      } catch (err) {
        reject(err)
      }
    } else {
      resolve()
    }
  }

  function onceDone(h) {
    _p = _p.then((...args) => {
      return new Promise((resolve, reject) => {
        b.once('done', () => {
          setTimeout(() => {
            _call(h, args, resolve, reject)
          }, 0)
        })
      })
    })
    return dsl
  }

  function then(h, delay = 0) {
    _p = _p.then((...args) => {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          _call(h, args, resolve, reject)
        }, delay)
      })
    })
    return dsl
  }
}

module.exports = {
  start
}