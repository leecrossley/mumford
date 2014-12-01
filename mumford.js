var when = function (condition) {
    var when = this;

    var iterator = function (then) {
        if (condition()) {
            then();
        } else {
            setTimeout(iterator.bind(this, then), 50);
        }
        return when;
    };

    return {
        then: iterator
    };
};

if (typeof (exports) !== "undefined") {
    exports.when = when;
}
