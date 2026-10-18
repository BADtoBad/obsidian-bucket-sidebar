import http from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

// Local manual test only. No disk-writing or general file-serving endpoints.
const root = new URL("../", import.meta.url);
const html = await readFile(new URL("test/browser/save-recovery.html", root));
const bundle = await build({
  absWorkingDir: fileURLToPath(root), entryPoints: ["test/browser/save-recovery.mjs"],
  tsconfig: fileURLToPath(new URL("tsconfig.json", root)),
  bundle: true, format: "esm", platform: "browser", target: "es2022", write: false,
  alias: { obsidian: fileURLToPath(new URL("test/browser/save-recovery-host.mjs", root)) }
});
const server = http.createServer((request, response) => {
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'none'; frame-ancestors 'none'");
  if (request.method === "GET" && request.url === "/") {
    response.setHeader("Content-Type", "text/html; charset=utf-8");
    response.end(html);
  } else if (request.method === "GET" && request.url === "/fixture.js") {
    response.setHeader("Content-Type", "text/javascript; charset=utf-8");
    response.end(bundle.outputFiles[0].contents);
  } else {
    response.writeHead(404); response.end("Not found");
  }
});
server.listen(0, "127.0.0.1", () => console.log(`http://127.0.0.1:${server.address().port}/`));
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => server.close());
