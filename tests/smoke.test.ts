import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

import { describe, expect, it } from "vitest";

const esmEntry = fileURLToPath(new URL("../dist/index.mjs", import.meta.url));
const cjsEntry = fileURLToPath(new URL("../dist/index.cjs", import.meta.url));

describe("built artefacts", () => {
    it("supports ESM imports from dist", () => {
        const output = execFileSync(
            process.execPath,
            [
                "--input-type=module",
                "--eval",
                `
import { repeatUntil, waitFor } from ${JSON.stringify(pathToFileURL(esmEntry).href)};

await waitFor(() => true);
const result = await repeatUntil(async () => 7, {
    until: (value) => value === 7,
});

process.stdout.write(String(result));
`,
            ],
            {
                encoding: "utf8",
            },
        );

        expect(output).toBe("7");
    });

    it("supports CommonJS require from dist", () => {
        const output = execFileSync(
            process.execPath,
            [
                "--eval",
                `
const { repeatUntil, waitFor } = require(${JSON.stringify(cjsEntry)});

(async () => {
    await waitFor(() => true);
    const result = await repeatUntil(async () => 9, {
        until: (value) => value === 9,
    });

    process.stdout.write(String(result));
})().catch((error) => {
    console.error(error);
    process.exit(1);
});
`,
            ],
            {
                encoding: "utf8",
            },
        );

        expect(output).toBe("9");
    });
});
