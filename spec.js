/* global when */

describe("mumford", function() {

    it("should have a global when object", function() {
        expect(when).toBeDefined();
    });

    it("should run then when a 500ms timeout has elapsed", function(done) {
        var hasWaited500ms;

        setTimeout(function() {
            hasWaited500ms = true;
        }, 500);

        when(function() {
            return hasWaited500ms;
        }).then(function() {
            expect(hasWaited500ms).toBeTruthy();
            done();
        });
    });

});
