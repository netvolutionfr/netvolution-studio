// Production server of the Studio (ADR-0015): the built application and the API on one port, for a
// container behind a reverse proxy that provides HTTPS and the access protection (CLAUDE §8). No
// authentication here: never expose this port directly to the Internet.
import { readFile } from 'node:fs/promises';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { extname, join, resolve, sep } from 'node:path';
import { aiConfigFromEnv } from './dev-server/ai/service.ts';
import { createApi } from './dev-server/api.ts';

const repo = resolve(import.meta.dirname, '../..');
const root = resolve(import.meta.dirname, 'dist');
const dataDir = resolve(process.env.NS_DATA_DIR ?? join(repo, 'data'));
const host = process.env.HOST ?? '127.0.0.1';
const port = Number(process.env.PORT ?? 8080);

const api = createApi({
  dataDir,
  templatesDir: join(repo, 'templates'),
  fontsDir: join(repo, 'fonts'),
  exportsDir: resolve(process.env.NS_EXPORTS_DIR ?? join(dataDir, 'exports')),
  ai: aiConfigFromEnv(process.env, join(dataDir, 'ai-log.jsonl')),
});

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};
const HEADERS = {
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'same-origin',
  'x-frame-options': 'SAMEORIGIN',
};

/** The built files only (GET/HEAD), hashed assets cached for good, pages always revalidated. */
async function statics(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return void res.writeHead(405, HEADERS).end();
  let path = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  if (path.endsWith('/')) path += 'index.html';
  const file = resolve(root, `.${path}`);
  if (!file.startsWith(root + sep)) return void res.writeHead(400, HEADERS).end();
  try {
    const content = await readFile(file);
    res.writeHead(200, {
      ...HEADERS,
      'content-type': TYPES[extname(file)] ?? 'application/octet-stream',
      // Hashed files of the Studio (Vite) and of the guide (Astro): cached for good.
      'cache-control': /^\/(assets|guide\/_astro)\//.test(path)
        ? 'public, max-age=31536000, immutable'
        : 'no-cache',
    });
    res.end(req.method === 'HEAD' ? undefined : content);
  } catch {
    res.writeHead(404, HEADERS).end();
  }
}

createServer((req, res) => api(req, res, () => void statics(req, res))).listen(port, host, () =>
  console.log(`Netvolution Studio sur http://${host}:${port}/ (données : ${dataDir})`),
);
