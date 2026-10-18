import { createServer } from "node:http";
import { readFile } from "node:fs/promises";

// Only expose this synthetic fixture and the production stylesheet on loopback.
const routes = new Map([
  ["/", ["test/browser/accessible-label.html", "text/html; charset=utf-8"]],
  ["/styles.css", ["styles.css", "text/css; charset=utf-8"]]
]);
const server = createServer(async (request, response) => {
  const route = routes.get(request.url);
  if (!route) { response.writeHead(404); response.end(); return; }
  try {
    const content = await readFile(route[0]);
    response.writeHead(200, { "Content-Type": route[1], "Cache-Control": "no-store" });
    response.end(content);
  } catch { response.writeHead(500); response.end(); }
});
server.listen(0, "127.0.0.1", () => console.log(`http://127.0.0.1:${server.address().port}`));
