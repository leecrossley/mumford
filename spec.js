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

    it("should chain second when", function(done) {
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

});
