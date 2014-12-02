var when = function (func) {
    var when = this;

    var queue = [];

    var isRunning;

    var triggerQueue = function () {
        if (queue.length > 0) {
            queue[0]();
        }
        isRunning = true;
    };

    var then = function (callback) {
        queue.push(iterator.bind(this, callback, func));
        triggerQueue();
        return when;
    };

    var iterator = function (callback, condition) {
        if (condition()) {
            callback();
            isRunning = false;
            queue.shift();
            triggerQueue();
        } else {
            setTimeout(iterator.bind(this, callback, condition), 50);
        }
    };

    return {
        then: then
    };
};

if (typeof (exports) !== "undefined") {
    exports.when = when;
}
