import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";

const port = Number(process.env.PORT || 3000);
const artifactDir = path.resolve(process.cwd(), "out");

const contentTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "application/javascript; charset=utf-8"],
  [".mjs", "application/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".txt", "text/plain; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"],
  [".gif", "image/gif"],
  [".ico", "image/x-icon"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"],
  [".ttf", "font/ttf"],
  [".otf", "font/otf"],
  [".wasm", "application/wasm"],
]);

async function fileExists(filePath) {
  try {
    const stats = await fs.stat(filePath);
    return stats.isFile();
  } catch {
    return false;
  }
}

function safeJoin(baseDir, requestedPath) {
  const normalized = path.posix.normalize(requestedPath);
  const withoutLeadingSlash = normalized.replace(/^\/+/, "");
  const resolved = path.resolve(baseDir, withoutLeadingSlash);
  const relative = path.relative(baseDir, resolved);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return null;
  }

  return resolved;
}

async function resolveFile(urlPath) {
  const pathname = decodeURIComponent(urlPath.split("?")[0] || "/");
  const candidates = [];

  if (pathname === "/" || pathname === "") {
    candidates.push("/index.html");
  } else {
    candidates.push(pathname);

    if (!path.extname(pathname)) {
      candidates.push(`${pathname}.html`);
      candidates.push(path.posix.join(pathname, "index.html"));
    }

    if (pathname.endsWith("/")) {
      candidates.push(path.posix.join(pathname, "index.html"));
    }
  }

  for (const candidate of candidates) {
    const absolutePath = safeJoin(artifactDir, candidate);
    if (!absolutePath) {
      return null;
    }

    if (await fileExists(absolutePath)) {
      return absolutePath;
    }
  }

  const fallbackPath = safeJoin(artifactDir, "/index.html");
  if (fallbackPath && await fileExists(fallbackPath)) {
    return fallbackPath;
  }

  return null;
}

const server = http.createServer(async (req, res) => {
  try {
    const filePath = await resolveFile(req.url || "/");

    if (!filePath) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Ontology preview files were not found. Run `npm run build` first.\n");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = contentTypes.get(ext) || "application/octet-stream";
    const body = await fs.readFile(filePath);

    res.setHeader("Cache-Control", "no-store");
    res.writeHead(200, { "Content-Type": contentType });
    res.end(body);
  } catch (error) {
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(`Preview server error\n${error instanceof Error ? error.message : String(error)}\n`);
  }
});

server.listen(port, () => {
  console.log(`Ontology preview server listening on http://localhost:${port}`);
});
