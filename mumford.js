var when = function (condition) {
    var when = this;

    var Defer = function () {
        var deferred;

        var defer = function (callback) {
            deferred = callback;
        };

        defer.resolve = function() {
            if (deferred) {
                deferred();
            }
        };

        return defer;
    };

    var iterator = function (callback, defer) {
        if (condition()) {
            callback();
            return defer.resolve();
        }
        setTimeout(iterator.bind(this, callback, defer), 50);
    };

    var then = function (callback) {
        var defer = new Defer(when);
        iterator(callback, defer);
        return defer;
    };

    return {
        then: then
    };
};

if (typeof (exports) !== "undefined") {
    exports.when = when;
}
