var when = function (condition) {
    var iterator = function (then) {
        if (condition()) {
            return then();
        }
        return setTimeout(iterator.bind(this, then), 50);
    };

    return {
        then: iterator
    };
};

if (typeof (exports) !== "undefined") {
    exports.when = when;
}
