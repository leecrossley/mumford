var when = function (condition) {
    var context = this;

    var iterator = function (then) {
        if (condition()) {
            then();
        } else {
            setTimeout(iterator.bind(this, then), 50);
        }
        return context;
    };

    return {
        then: iterator
    };
};

if (typeof (exports) !== "undefined") {
    exports.when = when;
}
