#!/usr/bin/env node
/** @deprecated Use scripts/fetch-zctas.mjs — kept for npm script compatibility. */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const target = path.join(__dirname, "fetch-zctas.mjs");
const child = spawn(process.execPath, [target, ...process.argv.slice(2)], {
  stdio: "inherit",
});
child.on("exit", (code) => process.exit(code ?? 1));
