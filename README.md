# mumford [![Build Status](https://travis-ci.org/leecrossley/mumford.png?branch=master)](https://travis-ci.org/leecrossley/mumford) [![npm version](https://badge.fury.io/js/mumford.png)](https://npmjs.org/package/mumford) [![devDependency Status](https://david-dm.org/leecrossley/mumford/dev-status.png)](https://david-dm.org/leecrossley/mumford#info=devDependencies)

[I will wait](https://www.youtube.com/watch?v=rGKfrgqWcv0)

## Basic usage

Pass `when` a function, once it returns true, the `then` function will be resolved.

`when` can be chained and will run synchronously.

```js
when(condition).then(function() {
    // do something
})
.when(somethingElse).then(function() {
    // you can chain when synchronously
});
```

## License

[MIT License](http://ilee.mit-license.org)
