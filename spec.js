/* global when */

describe("mumford", function() {

    it("should have a global when object", function() {
        expect(when).toBeDefined();
    });

    it("should run then when a 500ms timeout has elapsed", function(done) {
        var waited;

        var hasWaited = function () {
            return waited;
        };

        setTimeout(function() {
            waited = true;
        }, 500);

        when(hasWaited).then(function() {
            expect(waited).toBeTruthy();
            done();
        });
    });

    it("should chain two whens and run thens at the correct time", function(done) {
        var waited;

        var hasWaited = function () {
            return waited;
        };

        var triggerTimeout = function () {
            setTimeout(function() {
                waited = true;
            }, 500);
        };

        triggerTimeout();

        when(hasWaited).then(function() {
            expect(waited).toBeTruthy();
            waited = false;
            triggerTimeout();
        })
        .when(hasWaited).then(function() {
            expect(waited).toBeTruthy();
            done();
        });
    });

    it("should chain three whens and run thens at the correct time", function(done) {
        var waited;

        var callOrder = [];

        var hasWaited = function () {
            return waited;
        };

        var alwaysTrue = function () {
            return true;
        };

        var triggerTimeout = function () {
            setTimeout(function() {
                waited = true;
            }, 500);
        };

        triggerTimeout();

        when(hasWaited).then(function() {
            callOrder.push(1);
        })
        .when(alwaysTrue).then(function() {
            waited = false;
            callOrder.push(2);
            triggerTimeout();
        })
        .when(hasWaited).then(function() {
            callOrder.push(3);
            expect(callOrder).toEqual([1, 2, 3]);

            done();
        });
    });

});
