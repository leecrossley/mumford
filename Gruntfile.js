module.exports = function (grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON("package.json"),
        jshint: {
            all: [
                "mumford.js"
            ]
        },
        jasmine: {
            src: "mumford.js",
            options: {
                specs: "spec.js"
            }
        }
    });

    grunt.loadNpmTasks("grunt-contrib-jshint");
    grunt.loadNpmTasks("grunt-contrib-jasmine");

    grunt.registerTask("test", ["jshint", "jasmine"]);
};
