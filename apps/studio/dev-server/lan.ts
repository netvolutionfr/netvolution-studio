// Device preview on the local network (ADR-0027): a second HTTP server, started on demand, that shows
// one project's preview (preview.html) to phones and tablets of the same network, live. It serves
// nothing else: no project list, no mutation. Access needs the session token carried by the QR code.
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { networkInterfaces } from 'node:os';
import { renderSVG } from 'uqr';

type Handler = (req: IncomingMessage, res: ServerResponse) => void;

export type LanOptions = {
  /** The Studio API (media files, saved project) for the requests the LAN server lets through. */
  api: Handler;
  /** The built Studio files (preview.html and its assets). */
  statics: Handler;
  /** Listening port; 0 (default): a free one. */
  port?: number;
  /** Address shown in the QR code; default: the first private IPv4 address of this machine. */
  address?: string;
};

export type LanShare = { projectId: string; url: string; qr: string };
export type Lan = ReturnType<typeof createLan>;

const PRIVATE = /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/;
const COOKIE = 'ns-lan';
const PING = 25_000;

function lanAddress() {
  for (const list of Object.values(networkInterfaces()))
    for (const a of list ?? [])
      if (a.family === 'IPv4' && !a.internal && PRIVATE.test(a.address)) return a.address;
  return null;
}

const same = (a: string, b: string) =>
  a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

export function createLan(options: LanOptions) {
  let server: Server | null = null;
  let share: (LanShare & { token: string }) | null = null;
  /** Latest site sent by the editor, one line of JSON (an SSE event). */
  let live: string | null = null;
  const clients = new Set<ServerResponse>();

  const event = (res: ServerResponse) => live && res.write(`data: ${live}\n\n`);

  const handler: Handler = (req, res) => {
    const current = share;
    const url = new URL(req.url ?? '/', 'http://lan');
    const cookie = /(?:^|;\s*)ns-lan=([a-f0-9]+)/.exec(req.headers.cookie ?? '')?.[1] ?? '';
    const query = url.searchParams.get('t') ?? '';
    if (!current || req.method !== 'GET' || !(same(query, current.token) || same(cookie, current.token)))
      return void res.writeHead(403, { 'content-type': 'text/plain' }).end('Forbidden');
    const id = current.projectId;
    // The QR code's address: keeps the token in a cookie, then opens the preview of the project.
    // Lax, not Strict: the camera opens the address from outside, and a Strict cookie would not be
    // sent on the redirect that follows (403 on the preview). Only GET is served here anyway.
    if (url.pathname === '/') {
      return void res
        .writeHead(302, {
          'set-cookie': `${COOKIE}=${current.token}; HttpOnly; SameSite=Lax; Path=/`,
          location: `/preview.html#/${id}/`,
          'cache-control': 'no-store',
        })
        .end();
    }
    if (url.pathname === `/api/live/${id}`) {
      res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store' }).flushHeaders();
      event(res);
      clients.add(res);
      const ping = setInterval(() => res.write(': ping\n\n'), PING);
      req.on('close', () => {
        clearInterval(ping);
        clients.delete(res);
      });
      return;
    }
    if (url.pathname === '/preview.html' || url.pathname.startsWith('/assets/'))
      return options.statics(req, res);
    if (url.pathname === `/api/projects/${id}` || url.pathname.startsWith(`/media/${id}/`)) {
      // The API only accepts local host names (DNS rebinding); here the token stands for that check.
      req.headers.host = '127.0.0.1';
      return options.api(req, res);
    }
    res.writeHead(404, { 'content-type': 'text/plain' }).end('Not found');
  };

  const status = (): LanShare | null => share && { projectId: share.projectId, url: share.url, qr: share.qr };

  return {
    status,

    /** Shares a project: (re)starts the LAN server with a new token. Null without a network address. */
    async start(projectId: string): Promise<LanShare | null> {
      const address = options.address ?? lanAddress();
      if (!address) return null;
      await this.stop();
      const listening = createServer(handler);
      await new Promise<void>((done, fail) =>
        listening.once('error', fail).listen(options.port ?? 0, '0.0.0.0', done),
      );
      server = listening;
      const port = (listening.address() as { port: number }).port;
      const token = randomBytes(24).toString('hex');
      const url = `http://${address}:${port}/?t=${token}`;
      share = { projectId, token, url, qr: renderSVG(url, { border: 2 }) };
      live = null;
      return status();
    },

    async stop() {
      share = null;
      live = null;
      for (const res of clients) res.end();
      clients.clear();
      const closing = server;
      server = null;
      if (closing) await new Promise((done) => closing.close(done));
    },

    /** The editor's current site (validated by the caller): sent to every connected device. */
    publish(projectId: string, site: unknown) {
      if (share?.projectId !== projectId) return false;
      live = JSON.stringify(site);
      for (const res of clients) event(res);
      return true;
    },
  };
}
