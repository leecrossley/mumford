# mumford [![Build Status](https://travis-ci.org/leecrossley/mumford.png?branch=master)](https://travis-ci.org/leecrossley/mumford) [![npm version](https://badge.fury.io/js/mumford.png)](https://npmjs.org/package/mumford) [![devDependency Status](https://david-dm.org/leecrossley/mumford/dev-status.png)](https://david-dm.org/leecrossley/mumford#info=devDependencies)

[I will wait](https://www.youtube.com/watch?v=rGKfrgqWcv0)

## when().then()

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

## doUntil().then()

Pass `doUntil` a function that takes a parameter `next`, an async function can then be executed, calling next in it's own callback. If `next` is passed true, it will run again. Passing false will resolve the `then` function.

```js
doUntil(function (next) {
    var item = input.shift();
    someAsyncFunction(function() {
        next(true); // passing false will resolve then()
    });
}).then(function() {
    // do something after
});
```


## License

[MIT License](http://ilee.mit-license.org)
