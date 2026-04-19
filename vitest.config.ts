import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment: "node",
        fakeTimers: {
            toFake: [
                "Date",
                "clearImmediate",
                "clearTimeout",
                "performance",
                "setImmediate",
                "setTimeout",
            ],
        },
    },
});
