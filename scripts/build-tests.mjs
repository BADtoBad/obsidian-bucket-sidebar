import { readdir, rm } from "node:fs/promises";
import esbuild from "esbuild";

await rm(".test-build", { recursive: true, force: true });
const entryPoints = (await readdir("test"))
  .filter((name) => name.endsWith(".test.ts"))
  .map((name) => `test/${name}`);

await esbuild.build({
  entryPoints,
  bundle: true,
  format: "esm",
  platform: "node",
  target: "node16",
  tsconfig: "tsconfig.json",
  outExtension: { ".js": ".mjs" },
  outdir: ".test-build",
  logLevel: "warning"
});
