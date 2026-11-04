// Server statis kecil untuk E2E. CSP aplikasi memblokir file://, jadi tes
// harus lewat HTTP seperti produksi.
import http from "node:http";
import { createReadStream, statSync } from "node:fs";
import { extname, join, normalize, relative } from "node:path";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".cjs": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

export function startServer(root, port = 0) {
  const base = normalize(root);
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent((req.url || "/").split("?")[0]);
    const file = normalize(join(base, url === "/" ? "index.html" : url));
    if (relative(base, file).startsWith("..")) {
      res.writeHead(403).end("forbidden");
      return;
    }
    let size;
    try {
      size = statSync(file).size;
    } catch {
      res.writeHead(404).end("not found");
      return;
    }
    res.writeHead(200, {
      "content-type": MIME[extname(file)] || "application/octet-stream",
      "content-length": size,
    });
    createReadStream(file).pipe(res);
  });

  return new Promise((resolve) => {
    server.listen(port, "127.0.0.1", () => {
      const { port: actual } = server.address();
      resolve({
        url: `http://127.0.0.1:${actual}`,
        close: () => new Promise((done) => server.close(done)),
      });
    });
  });
}
