import { readFile } from 'node:fs/promises';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { extname, join, normalize } from 'node:path';

const TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2',
};
type Middleware = (req: IncomingMessage, res: ServerResponse, next: () => void) => void;

/**
 * Minimal static server on 127.0.0.1 with a random port (tests only).
 * `mounts` maps URL prefixes to extra directories; `middleware` runs first.
 */
export function serve(
  root: string,
  options: { mounts?: Record<string, string>; middleware?: Middleware } = {},
): Promise<{ url: string; server: Server }> {
  const statics = async (req: IncomingMessage, res: ServerResponse) => {
    let path = normalize(decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname));
    if (path.endsWith('/')) path += 'index.html';
    const mount = Object.entries(options.mounts ?? {}).find(([prefix]) => path.startsWith(prefix));
    const file = mount ? join(mount[1], path.slice(mount[0].length)) : join(root, path);
    try {
      const body = await readFile(file);
      res.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream' }).end(body);
    } catch {
      res.writeHead(404).end();
    }
  };
  const server = createServer((req, res) =>
    options.middleware ? options.middleware(req, res, () => void statics(req, res)) : void statics(req, res),
  );
  return new Promise((ok) =>
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      ok({ url: `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`, server });
    }),
  );
}
