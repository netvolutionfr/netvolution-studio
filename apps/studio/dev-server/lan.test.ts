import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { createApi } from './api.ts';
import { createLan } from './lan.ts';

const repo = join(import.meta.dirname, '../../..');
const H = { 'x-ns-request': '1', 'content-type': 'application/json' };
let dir = '';
let base = '';
let close = () => {};

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), 'ns-lan-'));
  const lan = createLan({
    address: '127.0.0.1',
    api: (req, res) => api(req, res, () => void res.writeHead(404).end()),
    statics: (_req, res) => void res.writeHead(200, { 'content-type': 'text/html' }).end('preview'),
  });
  const api = createApi({
    dataDir: join(dir, 'data'),
    exportsDir: join(dir, 'exports'),
    allowedHosts: ['127.0.0.1'],
    lan,
  });
  const server = createServer((req, res) => api(req, res, () => res.writeHead(404).end()));
  await new Promise<void>((ok) => server.listen(0, '127.0.0.1', ok));
  base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  close = () => {
    void lan.stop();
    server.close();
  };
});
afterAll(async () => {
  close();
  await rm(dir, { recursive: true });
});

it('shares one project with token holders only, and relays the live site', async () => {
  const doc = JSON.parse(await readFile(join(repo, 'fixtures/typography.json'), 'utf8'));
  const { id } = (await (
    await fetch(`${base}/api/projects`, { method: 'POST', headers: H, body: JSON.stringify(doc) })
  ).json()) as { id: string };
  expect(await (await fetch(`${base}/api/lan`)).json()).toEqual({ available: true, share: null });

  const share = (await (
    await fetch(`${base}/api/lan`, { method: 'POST', headers: H, body: JSON.stringify({ projectId: id }) })
  ).json()) as { url: string; qr: string };
  expect(share.qr).toContain('<svg');
  const lan = new URL(share.url);
  const at = (path: string, init?: RequestInit) =>
    fetch(new URL(path, lan.origin), { redirect: 'manual', ...init });

  // Without the token: nothing, not even the preview page.
  expect((await at('/preview.html')).status).toBe(403);
  expect((await at('/?t=bad')).status).toBe(403);
  // The QR code's address: a cookie, then the project's preview.
  const entry = await at(share.url);
  expect(entry.status).toBe(302);
  expect(entry.headers.get('location')).toBe(`/preview.html#/${id}/`);
  // Lax: sent on the redirect of a navigation coming from another app (the camera).
  expect(entry.headers.get('set-cookie')).toContain('SameSite=Lax');
  const cookie = (entry.headers.get('set-cookie') ?? '').split(';')[0] as string;
  const withCookie = { headers: { cookie } };
  expect(await (await at('/preview.html', withCookie)).text()).toBe('preview');
  expect((await at(`/api/projects/${id}`, withCookie)).status).toBe(200);
  // Only that project, read-only: no list, no other route, no mutation.
  expect((await at('/api/projects', withCookie)).status).toBe(404);
  expect((await at(`/api/projects/${id}`, { method: 'DELETE', ...withCookie })).status).toBe(403);

  // Live: the editor's site reaches the connected devices.
  const stream = await at(`/api/live/${id}`, withCookie);
  const reader = (stream.body as ReadableStream<Uint8Array>).getReader();
  const saved = await (await fetch(`${base}/api/projects/${id}`)).json();
  const edited = { ...saved, name: 'Live edit' };
  const put = await fetch(`${base}/api/live/${id}`, {
    method: 'PUT',
    headers: H,
    body: JSON.stringify(edited),
  });
  expect(put.status).toBe(204);
  const chunk = new TextDecoder().decode((await reader.read()).value);
  expect(JSON.parse(chunk.replace(/^data: /, '')).name).toBe('Live edit');
  await reader.cancel();

  // Stopped: the address no longer answers.
  expect((await fetch(`${base}/api/lan`, { method: 'DELETE', headers: H })).status).toBe(204);
  await expect(at('/preview.html', withCookie)).rejects.toThrow();
});
