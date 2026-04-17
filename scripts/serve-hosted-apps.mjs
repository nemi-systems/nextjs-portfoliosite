import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";

import hostedApps from "../hosted-apps.json" with { type: "json" };

const port = Number(process.env.PORT || 3000);
const repoRoot = process.cwd();
const rootDomain = hostedApps.rootDomain;

const CONTENT_TYPES = new Map([
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
  [".pdf", "application/pdf"],
  [".mp3", "audio/mpeg"],
]);

const responseHeadersByProfile = {
  standard: {},
};

const sites = hostedApps.sites.map((site) => ({
  ...site,
  artifactDir: path.resolve(repoRoot, site.artifactPath),
}));

const defaultSite = sites.find((site) => site.id === "portfolio") ?? sites[0];

const hostToSite = new Map();

function addHostAlias(hostname, site) {
  if (!hostname) {
    return;
  }

  hostToSite.set(hostname, site);
}

for (const site of sites) {
  for (const alias of site.domainAliases) {
    addHostAlias(alias, site);

    if (alias === rootDomain) {
      addHostAlias("localhost", site);
      addHostAlias("127.0.0.1", site);
      addHostAlias("[::1]", site);
      addHostAlias("www.localhost", site);
      continue;
    }

    if (alias.endsWith(`.${rootDomain}`)) {
      const subdomain = alias.slice(0, -(`.${rootDomain}`.length));
      addHostAlias(`${subdomain}.localhost`, site);
    }
  }
}

function sanitizeHost(hostHeader) {
  return (hostHeader || "").trim().toLowerCase().replace(/:\d+$/, "");
}

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

async function resolveFile(site, urlPath) {
  const pathname = decodeURIComponent(urlPath.split("?")[0] || "/");
  const candidates = [];

  if (pathname === "/" || pathname === "") {
    candidates.push(`/${site.defaultRootObject}`);
  } else {
    candidates.push(pathname);

    if (!path.extname(pathname)) {
      candidates.push(`${pathname}.html`);
      candidates.push(path.posix.join(pathname, "index.html"));
    }

    if (pathname.endsWith("/")) {
      candidates.push(path.posix.join(pathname, site.defaultRootObject));
    }
  }

  for (const candidate of candidates) {
    const absolutePath = safeJoin(site.artifactDir, candidate);
    if (!absolutePath) {
      return null;
    }

    if (await fileExists(absolutePath)) {
      return absolutePath;
    }
  }

  const fallbackPath = safeJoin(site.artifactDir, site.fallbackPagePath || "/index.html");
  if (fallbackPath && await fileExists(fallbackPath)) {
    return fallbackPath;
  }

  return null;
}

function applyHeaders(res, site) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Hosted-App", site.id);

  const profileHeaders = responseHeadersByProfile[site.responseHeaders] || {};
  for (const [header, value] of Object.entries(profileHeaders)) {
    res.setHeader(header, value);
  }
}

const server = http.createServer(async (req, res) => {
  const site = hostToSite.get(sanitizeHost(req.headers.host)) ?? defaultSite;

  try {
    const filePath = await resolveFile(site, req.url || "/");

    if (!filePath) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end(`Not found for ${site.id}\n`);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = CONTENT_TYPES.get(ext) || "application/octet-stream";
    const body = await fs.readFile(filePath);

    applyHeaders(res, site);
    res.writeHead(200, { "Content-Type": contentType });
    res.end(body);
  } catch (error) {
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(`Preview server error\n${error instanceof Error ? error.message : String(error)}\n`);
  }
});

server.listen(port, () => {
  const previewUrls = [
    `http://localhost:${port}`,
    `http://synth.localhost:${port}`,
    `http://gravitylens.localhost:${port}`,
    `http://ontology.localhost:${port}`,
  ];

  console.log(`Hosted app preview server listening on port ${port}`);
  for (const url of previewUrls) {
    console.log(`- ${url}`);
  }
});
