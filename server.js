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

async function handleRequest(request, response) {
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
}

function listen(host, ipv6Only = false) {
  const server = createServer(handleRequest);

  return new Promise((resolve, reject) => {
    server.once("error", (error) => {
      if (error.code === "EAFNOSUPPORT" || error.code === "EINVAL") {
        resolve(null);
        return;
      }
      reject(error);
    });
    server.listen({ port, host, ipv6Only }, () => resolve(server));
  });
}

try {
  // Browsers resolve localhost to ::1 before 127.0.0.1. Listen on both so the
  // first address does not fail with connection refused.
  const ipv4 = await listen("0.0.0.0");
  const ipv6 = await listen("::", true);

  if (!ipv4 && !ipv6) {
    throw new Error("No local network address was available.");
  }

  console.log(`Eye biomechanics is available at http://localhost:${port}`);
} catch (error) {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${port} is already in use. Stop that process or run PORT=4180 npm start.`);
    process.exit(1);
  }
  throw error;
}
