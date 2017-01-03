# Substance Bundler

This is our custom bundling library tailored to our needs, a more light-weight than web-pack, and a bit more like gulp.

Our approach is to use ES6 for Javascript, and using CSS 2.1 plus some next features using PostCSS (modules, variables).

Typically we bundle everything into a `dist` folder and watch files during development.

# Bundling a JS library

Consider a library 'foo' with ES6 index file.

## CJS / Node

To be able to use the library from a ES5 CommonJS project, define a target
with format `cjs`, and specify a `moduleName`.

```
b.js('index.es6.js', {
  targets: [{
    dest: './dist/foo.cjs.js',
    format: 'cjs', moduleName: 'foo'
  }]
})
```

> Note: target options are passed to [`rollup`](https://github.com/rollup/rollup/wiki/Command-Line-Interface#targets).

## ES6

```
b.js('index.es6.js', {
  targets: [{
    dest: './dist/foo.es6.js',
    format: 'es'
  }]
})
```

## Browser

```
b.js('index.es6.js', {
  targets: [{
    dest: './dist/foo.js',
    format: 'umd', moduleName: 'foo'
  }]
})
```

# Bundling with dependencies

TODO