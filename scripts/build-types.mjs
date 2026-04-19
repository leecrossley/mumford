import { execFile } from "node:child_process";
import { copyFile, rename, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const tscBinary = process.platform === "win32" ? "tsc.cmd" : "tsc";

const typesDirectory = fileURLToPath(new URL("../dist/types", import.meta.url));
const sourceDeclaration = fileURLToPath(
    new URL("../dist/types/index.d.ts", import.meta.url),
);
const esmDeclaration = fileURLToPath(
    new URL("../dist/index.d.mts", import.meta.url),
);
const cjsDeclaration = fileURLToPath(
    new URL("../dist/index.d.cts", import.meta.url),
);
const legacyDeclaration = fileURLToPath(
    new URL("../dist/index.d.ts", import.meta.url),
);

await execFileAsync(tscBinary, ["-p", "tsconfig.build.json"], {
    cwd: fileURLToPath(new URL("..", import.meta.url)),
});

await rename(sourceDeclaration, esmDeclaration);
await copyFile(esmDeclaration, cjsDeclaration);
await copyFile(cjsDeclaration, legacyDeclaration);
await rm(typesDirectory, { force: true, recursive: true });
