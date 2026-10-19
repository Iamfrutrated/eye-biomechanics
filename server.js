import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("./", import.meta.url));
const port = Number(process.env.PORT) || 4173;
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
};

function localPath(requestPath) {
  const pathname = decodeURIComponent(new URL(requestPath, "http://localhost").pathname);
  const relative = normalize(pathname).replace(/^[/\\]+/, "");
  const filePath = join(root, relative);

  if (filePath !== root && !filePath.startsWith(root.endsWith(sep) ? root : `${root}${sep}`)) {
    return null;
  }

  return pathname.endsWith("/") || relative === "" ? join(filePath, "index.html") : filePath;
}

const server = createServer(async (request, response) => {
  try {
    const requested = localPath(request.url ?? "/");
    if (!requested) {
      response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Forbidden");
      return;
    }

    const fileInfo = await stat(requested);
    const filePath = fileInfo.isDirectory() ? join(requested, "index.html") : requested;
    const content = await readFile(filePath);

    response.writeHead(200, {
      "Content-Type": types[extname(filePath)] ?? "application/octet-stream",
      "Cache-Control": "no-cache",
    });
    response.end(content);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
});

server.listen(port, () => {
  console.log(`Eye biomechanics is available at http://localhost:${port}`);
});
