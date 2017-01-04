# Substance Bundler

This is our custom bundling library tailored to our needs, a more light-weight than web-pack, and a bit more like gulp.

Our approach is to use ES6 for Javascript, and using CSS 2.1 plus some next features using PostCSS (modules, variables).

Typically we bundle everything into a `dist` folder and watch files during development.

# Bundling a JS library

Consider a library 'foo' written in ES6.

## NodeJS / CommonJS

To be able to use the library from Node, set the target format to 'cjs'.

```
b.js('index.es6.js', {
  target: {
    dest: './dist/foo.cjs.js',
    format: 'cjs'
  }
})
```

> Note: target options are passed to [`rollup`](https://github.com/rollup/rollup/wiki/Command-Line-Interface#targets).

## ES6

If you have CommonJS dependencies, it makes sense to provide an ES6 bundle, so that it is easier
to use your library without the need of extra configuration. Additionally it might bring a slight speed up.

> Note: if you don't do this, others will need to configure their bundler to treat the CommonJS code on their own.

```
b.js('index.es6.js', {
  target: {
    dest: './dist/foo.es6.js',
    format: 'es'
  }
})
```

In `package.json` you would then set `"jsnext:main": "dist/foo.es6.js"`.

## Browser

```
b.js('index.es6.js', {
  target: {
    dest: './dist/foo.js',
    format: 'umd', moduleName: 'foo'
  }
})
```

## CommonJS Dependencies

```
b.js('index.es6.js', {
  commonjs: ['lodash'],
  target: {
    dest: './dist/foo.js',
    format: 'es'
  }
})
```
