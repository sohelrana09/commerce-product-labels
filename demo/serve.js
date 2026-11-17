// Serves the storefront kit demo at http://localhost:4310 (npm run demo). No dependencies.
// Only demo/ and storefront/ are served, so nothing else in the repository is exposed.
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const allowed = [join(root, "demo"), join(root, "storefront")];
const port = Number(process.env.PORT) || 4310;
const types = {
  ".css": "text/css",
  ".html": "text/html",
  ".js": "text/javascript",
  ".json": "application/json",
};

createServer((request, response) => {
  const path = decodeURIComponent(new URL(request.url, "http://x").pathname);
  const file = normalize(join(root, path === "/" ? "demo/index.html" : path));
  const inside = allowed.some((dir) => file === dir || file.startsWith(dir + sep));
  if (!(inside && existsSync(file) && statSync(file).isFile())) {
    response.writeHead(404).end("Not found");
    return;
  }
  response.writeHead(200, {
    "Cache-Control": "no-store",
    "Content-Type": types[extname(file)] ?? "application/octet-stream",
  });
  createReadStream(file).pipe(response);
}).listen(port, () => {
  console.log(`Product Labels demo: http://localhost:${port}`);
});
