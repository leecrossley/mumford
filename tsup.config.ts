import { defineConfig } from "tsup";

export default defineConfig({
    clean: true,
    dts: false,
    entry: ["src/index.ts"],
    format: ["esm", "cjs"],
    outExtension({ format }) {
        return {
            js: format === "esm" ? ".mjs" : ".cjs",
        };
    },
    outDir: "dist",
    sourcemap: false,
    splitting: false,
    target: "node20",
});
