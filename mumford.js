var when = (function () {
    "use strict";

    var queue = [];
    var isRunning;

    return function (func) {
        var when = this;

        var triggerQueue = function () {
            if (!isRunning && queue.length > 0) {
                isRunning = true;
                queue[0]();
            }
        };

        var then = function (callback) {
            queue.push(iterator.bind(this, callback, func));
            triggerQueue();
            return when;
        };

        var iterator = function (callback, condition) {
            if (condition()) {
                callback();
                queue.shift();
                isRunning = false;
                triggerQueue();
            } else {
                setTimeout(iterator.bind(this, callback, condition), 50);
            }
        };

        return {
            then: then
        };
    };
}());

if (typeof (exports) !== "undefined") {
    exports.when = when;
}
