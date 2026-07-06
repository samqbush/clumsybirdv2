// Zero-dependency static server that mounts the built dist/ under a GitHub
// Pages-style project sub-path (/clumsybirdv2/). This lets the Phase 3 sub-path
// smoke prove the relative-base bundle loads from a nested directory URL exactly
// as it will on Pages -- something the root-served e2e (playwright.config.js)
// cannot verify. It also mirrors Pages' trailing-slash redirect
// (/clumsybirdv2 -> /clumsybirdv2/) so the "no trailing slash" pitfall is tested.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, normalize, extname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, '..', '..', 'dist');
const BASE = '/clumsybirdv2';
const PORT = Number(process.env.SUBPATH_PORT) || 4180;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.txt': 'text/plain; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
};

async function ensureDist() {
  try {
    await stat(join(DIST, 'index.html'));
  } catch {
    console.error(
      `[subpath serve] dist/ not built. Run "npm run build" first (looked in ${DIST}).`,
    );
    process.exit(1);
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  const pathname = decodeURIComponent(url.pathname);

  // Anything outside the base path is a 404 (mirrors a project Pages site).
  if (pathname !== BASE && !pathname.startsWith(`${BASE}/`)) {
    res.writeHead(404).end('Not found');
    return;
  }

  // Trailing-slash redirect, exactly like GitHub Pages for a directory URL.
  if (pathname === BASE) {
    res.writeHead(301, { Location: `${BASE}/` }).end();
    return;
  }

  let rel = pathname.slice(BASE.length); // leading '/'
  if (rel === '/') rel = '/index.html';

  // Prevent path traversal outside dist/.
  const filePath = normalize(join(DIST, rel));
  if (!filePath.startsWith(DIST)) {
    res.writeHead(403).end('Forbidden');
    return;
  }

  try {
    const body = await readFile(filePath);
    const type = TYPES[extname(filePath).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type }).end(body);
  } catch {
    res.writeHead(404).end('Not found');
  }
});

await ensureDist();
server.listen(PORT, '127.0.0.1', () => {
  console.log(`[subpath serve] dist/ mounted at http://127.0.0.1:${PORT}${BASE}/`);
});
