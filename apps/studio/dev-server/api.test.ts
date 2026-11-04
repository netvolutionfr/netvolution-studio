import { execFileSync } from 'node:child_process';
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer, request } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { aiConfigFromEnv } from './ai/service.ts';
import { createApi } from './api.ts';

const repo = join(import.meta.dirname, '../../..');
let base = '';
let dir = '';
let close = () => {};
const fixture = async (name = 'typography') =>
  JSON.parse(await readFile(join(repo, `fixtures/${name}.json`), 'utf8'));
const png = () => readFile(join(repo, 'fixtures/media/afixture001.png'));
const H = { 'x-ns-request': '1', 'content-type': 'application/json' };

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), 'ns-api-'));
  const api = createApi({
    dataDir: join(dir, 'data'),
    mediaDirs: [join(repo, 'fixtures/media')],
    templatesDir: join(repo, 'templates'),
    ai: aiConfigFromEnv({ NS_AI_PROVIDER: 'simulated', ANTHROPIC_API_KEY: 'sk-test-SECRET' }),
    exportsDir: join(dir, 'exports'),
    fontsDir: join(repo, 'fonts'),
  });
  const server = createServer((req, res) => api(req, res, () => res.writeHead(404).end()));
  await new Promise<void>((ok) => server.listen(0, '127.0.0.1', ok));
  const addr = server.address();
  base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`;
  close = () => server.close();
});
afterAll(async () => {
  close();
  await rm(dir, { recursive: true });
});

const create = async (body: unknown) => {
  const res = await fetch(`${base}/api/projects`, { method: 'POST', headers: H, body: JSON.stringify(body) });
  return {
    status: res.status,
    ...((await res.json()) as { id: string; etag: string; missingMedia: number }),
  };
};
const site = async (id: string) =>
  (await (await fetch(`${base}/api/projects/${id}`)).json()) as Record<string, unknown>;

describe('projects', () => {
  it('creates with a server id, reads and updates with optimistic concurrency', async () => {
    const d = await fixture();
    const { status, id, etag } = await create(d);
    expect(status).toBe(201);
    expect(id).toMatch(/^p[a-z0-9]{10}$/);
    const put = (body: unknown, headers: Record<string, string>) =>
      fetch(`${base}/api/projects/${id}`, {
        method: 'PUT',
        headers: { ...H, ...headers },
        body: JSON.stringify(body),
      });

    const read = await fetch(`${base}/api/projects/${id}`);
    expect(read.headers.get('etag')).toBe(etag);
    // A v1 document is stored migrated to a v2 site, under the project id.
    const stored = (await read.json()) as { id: string; kind: string; name: string; nodes: unknown };
    expect([stored.id, stored.kind, stored.name, stored.nodes]).toEqual([id, 'ns.site', d.title, d.nodes]);

    expect((await put(stored, {})).status).toBe(428);
    expect((await put({ ...stored, name: 'Modifié' }, { 'if-match': etag })).status).toBe(200);
    expect((await put(stored, { 'if-match': etag })).status).toBe(412); // stale ETag: never overwrite silently
    const list = (await (await fetch(`${base}/api/projects`)).json()) as {
      id: string;
      name: string;
      pages: number;
    }[];
    expect(list.find((p) => p.id === id)).toMatchObject({ name: 'Modifié', pages: 1 });
    expect((await readdir(join(dir, 'data/projects', id))).filter((f) => f.endsWith('.tmp'))).toEqual([]);
  });

  it('duplicates the folder under a new id and moves deleted projects to the trash', async () => {
    const { id } = await create(await fixture('elements'));
    const dup = await fetch(`${base}/api/projects/${id}/duplicate`, { method: 'POST', headers: H });
    const copy = ((await dup.json()) as { id: string }).id;
    expect(copy).not.toBe(id);
    expect(await site(copy)).toMatchObject({ id: copy, name: 'Éléments (copie)' });
    expect(await readdir(join(dir, 'data/projects', copy, 'media'))).toEqual(['afixture001.png']);

    expect((await fetch(`${base}/api/projects/${id}`, { method: 'DELETE', headers: H })).status).toBe(200);
    expect((await fetch(`${base}/api/projects/${id}`)).status).toBe(404);
    expect((await readdir(join(dir, 'data/trash'))).some((n) => n.startsWith(`${id}-`))).toBe(true);
  });

  it('refuses invalid sites with diagnostics, and mismatched ids', async () => {
    const bad = await create({ ...(await fixture()), schemaVersion: 99 });
    expect(bad.status).toBe(422);
    const { id, etag } = await create(await fixture());
    const mismatch = await fetch(`${base}/api/projects/${id}`, {
      method: 'PUT',
      headers: { ...H, 'if-match': etag },
      body: JSON.stringify({ ...(await site(id)), id: 'pother00000' }),
    });
    expect(mismatch.status).toBe(400);
  });

  it('refuses path traversal, unknown ids, missing CSRF header and foreign origins', async () => {
    expect((await fetch(`${base}/api/projects/..%2F..%2Fetc`)).status).toBe(400);
    expect((await fetch(`${base}/api/projects/pnothere000`)).status).toBe(404);
    const d = JSON.stringify(await fixture());
    expect((await fetch(`${base}/api/projects`, { method: 'POST', body: d })).status).toBe(403);
    const foreign = await fetch(`${base}/api/projects`, {
      method: 'POST',
      headers: { ...H, origin: 'https://evil.example' },
      body: d,
    });
    expect(foreign.status).toBe(403);
    for (const origin of ['null', 'not a URL', 'file:///tmp/test']) {
      const malformed = await fetch(`${base}/api/projects`, {
        method: 'POST',
        headers: { ...H, origin },
        body: d,
      });
      expect(malformed.status).toBe(403);
    }
  });

  it('refuses a Host outside allowedHosts (DNS rebinding), API and media alike', async () => {
    const api = createApi({
      dataDir: join(dir, 'hosts'),
      exportsDir: join(dir, 'exports'),
      allowedHosts: ['localhost'],
    });
    const server = createServer((req, res) => api(req, res, () => res.writeHead(404).end()));
    await new Promise<void>((ok) => server.listen(0, '127.0.0.1', ok));
    const port = (server.address() as { port: number }).port;
    const get = (path: string, host: string) =>
      new Promise<number>((ok, ko) =>
        request({ port, path, headers: { host } }, (res) => ok(res.resume().statusCode ?? 0))
          .on('error', ko)
          .end(),
      );
    expect(await get('/api/projects', `localhost:${port}`)).toBe(200);
    expect(await get('/api/projects', `LOCALHOST:${port}`)).toBe(200);
    expect(await get('/api/projects', `evil.example:${port}`)).toBe(403);
    expect(await get('/api/projects', `evil.example@localhost:${port}`)).toBe(403);
    expect(await get('/media/pnothere000/x.png', 'evil.example')).toBe(403);
    server.close();
  });
});

describe('media', () => {
  let project = '';
  beforeAll(async () => {
    project = (await create(await fixture('elements'))).id;
  });
  const upload = (body: Uint8Array | string, type: string, q = 'width=640&height=400') =>
    fetch(`${base}/api/projects/${project}/media?${q}`, {
      method: 'POST',
      headers: { 'x-ns-request': '1', 'content-type': type },
      body: body as BodyInit,
    });

  it('copies template media into the new project, isolated per project', async () => {
    expect((await fetch(`${base}/media/${project}/afixture001.png`)).status).toBe(200);
    const other = (await create(await fixture())).id;
    expect((await fetch(`${base}/media/${other}/afixture001.png`)).status).toBe(404);
    const imported = await create({
      ...(await fixture('elements')),
      assets: {
        ...(await fixture('elements')).assets,
        amissing0001: {
          id: 'amissing0001',
          kind: 'image',
          file: 'amissing0001.png',
          mime: 'image/png',
          width: 1,
          height: 1,
        },
      },
    });
    expect(imported.missingMedia).toBe(1);
  });

  it('stores images whose signature matches their type, and serves them', async () => {
    const res = await upload(await png(), 'image/png');
    expect(res.status).toBe(201);
    const asset = (await res.json()) as { id: string; file: string; width: number };
    expect(asset).toMatchObject({ kind: 'image', mime: 'image/png', width: 640, height: 400 });
    const served = await fetch(`${base}/media/${project}/${asset.file}`);
    expect(served.headers.get('content-type')).toBe('image/png');
    expect(served.headers.get('x-content-type-options')).toBe('nosniff');
    expect(Buffer.from(await served.arrayBuffer()).equals(await png())).toBe(true);
  });

  it('accepts safe SVG (served under a CSP) and whitelisted files (served as attachments)', async () => {
    const svg = await upload(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10"/></svg>',
      'image/svg+xml',
      'width=10&height=10&name=Logo%20%C2%AB%20NS%20%C2%BB&alt=Logo',
    );
    expect(svg.status).toBe(201);
    const asset = (await svg.json()) as { file: string };
    expect(asset).toMatchObject({ kind: 'svg', name: 'Logo « NS »', alt: 'Logo', width: 10 });
    const served = await fetch(`${base}/media/${project}/${asset.file}`);
    expect(served.headers.get('content-security-policy')).toMatch(/default-src 'none'/);
    const pdf = await upload('%PDF-1.7\n%…', 'application/pdf', 'name=Tarifs.pdf');
    expect(pdf.status).toBe(201);
    const file = (await pdf.json()) as { file: string; kind: string; size: number };
    expect([file.kind, file.size]).toEqual(['file', 13]); // '…' is 3 bytes
    expect((await fetch(`${base}/media/${project}/${file.file}`)).headers.get('content-disposition')).toBe(
      'attachment',
    );
    expect((await (await fetch(`${base}/api/projects/${project}/media`)).json()) as string[]).toEqual(
      expect.arrayContaining([asset.file, file.file]),
    );
  });

  it('accepts woff2 fonts, described from their file name, and catalog fonts with their licence (ADR-0018)', async () => {
    const woff2 = await readFile(join(repo, 'fonts/files/lato-700-normal.woff2'));
    const res = await upload(woff2, 'font/woff2', 'name=Lato-BoldItalic.woff2');
    expect(res.status).toBe(201);
    const font = (await res.json()) as { file: string };
    expect(font).toMatchObject({
      kind: 'font',
      family: 'Lato',
      weight: { min: 700, max: 700 },
      style: 'italic',
      size: woff2.length,
    });
    expect((await fetch(`${base}/media/${project}/${font.file}`)).headers.get('content-type')).toBe(
      'font/woff2',
    );
    expect((await upload('<html></html>', 'font/woff2')).status).toBe(415);

    const catalog = (await (await fetch(`${base}/api/fonts`)).json()) as { id: string }[];
    expect(catalog.map((f) => f.id)).toEqual(expect.arrayContaining(['inter', 'lora', 'roboto']));
    expect((await fetch(`${base}/api/fonts/files/inter-normal.woff2`)).status).toBe(200);
    expect((await fetch(`${base}/api/fonts/files/..%2Fcatalog.json`)).status).not.toBe(200);
    const added = await fetch(`${base}/api/projects/${project}/fonts`, {
      method: 'POST',
      headers: H,
      body: JSON.stringify({ font: 'inter' }),
    });
    expect(added.status).toBe(201);
    const assets = (await added.json()) as { file: string; style: string; license: string }[];
    expect(assets.map((a) => a.style)).toEqual(['normal', 'italic']);
    expect(assets[0]).toMatchObject({ family: 'Inter', weight: { min: 100, max: 900 } });
    expect(assets[0]?.license).toMatch(/Open Font License/);
    expect((await fetch(`${base}/media/${project}/${assets[0]?.file}`)).status).toBe(200);
    const unknown = await fetch(`${base}/api/projects/${project}/fonts`, {
      method: 'POST',
      headers: H,
      body: JSON.stringify({ font: '../x' }),
    });
    expect(unknown.status).toBe(404);
  });

  it('refuses unsafe SVG, spoofed types, bad dimensions and unsafe names', async () => {
    expect((await upload('<svg onload="alert(1)"/>', 'image/svg+xml')).status).toBe(415);
    expect((await upload('<html></html>', 'application/pdf')).status).toBe(415);
    expect((await upload('#!/bin/sh', 'application/x-sh')).status).toBe(415);
    expect((await upload('<html></html>', 'image/png')).status).toBe(415);
    expect((await upload(await png(), 'image/png', 'width=0&height=1')).status).toBe(400);
    expect((await fetch(`${base}/media/${project}/..%2Fsite.json`)).status).toBe(404);
    expect((await fetch(`${base}/media/..%2F..%2Fdata/afixture001.png`)).status).toBe(400);
  });
});

describe('export', () => {
  it('writes a standalone project from the posted site', async () => {
    const { id } = await create(await fixture('elements'));
    const res = await fetch(`${base}/api/projects/${id}/export`, {
      method: 'POST',
      headers: H,
      body: JSON.stringify({ site: await site(id) }),
    });
    expect(res.status).toBe(201);
    const { path } = (await res.json()) as { path: string };
    expect(path.startsWith(join(dir, 'exports'))).toBe(true);
    expect(await readdir(path)).toEqual(
      expect.arrayContaining(['package.json', 'package-lock.json', 'README.md', 'src']),
    );
    expect(await readdir(join(path, 'src/media'))).toEqual(['afixture001.png']); // optimized at build
  });
});

describe('pre-export checks and archive (SB-11, SB-12)', () => {
  it('refuses to export with blocking errors, and returns the warnings otherwise', async () => {
    const { id } = await create(await fixture('elements'));
    const current = (await site(id)) as { pages: { publish: boolean }[] };
    const blocked = await fetch(`${base}/api/projects/${id}/export`, {
      method: 'POST',
      headers: H,
      body: JSON.stringify({
        site: { ...current, pages: current.pages.map((p) => ({ ...p, publish: false })) },
      }),
    });
    expect(blocked.status).toBe(422);
    const { diagnostics } = (await blocked.json()) as { diagnostics: { code: string; severity: string }[] };
    expect(diagnostics.find((d) => d.severity === 'error')?.code).toBe('home-unpublished');
    const ok = await fetch(`${base}/api/projects/${id}/export`, {
      method: 'POST',
      headers: H,
      body: JSON.stringify({ site: current }),
    });
    const { checks } = (await ok.json()) as { checks: { severity: string; code: string }[] };
    expect(checks.every((c) => c.severity === 'warning')).toBe(true);
    expect(checks.map((c) => c.code)).toContain('no-site-url');
  });

  it('archives a project with its media and re-imports it as a new project; tampered media are dropped', async () => {
    const { id } = await create(await fixture('elements'));
    const res = await fetch(`${base}/api/projects/${id}/archive`);
    expect(res.headers.get('content-disposition')).toMatch(/attachment/);
    const archive = (await res.json()) as {
      format: string;
      site: { id: string };
      media: Record<string, string>;
    };
    expect([archive.format, Object.keys(archive.media)]).toEqual(['ns.archive', ['afixture001.png']]);
    const imported = await fetch(`${base}/api/projects/import`, {
      method: 'POST',
      headers: H,
      body: JSON.stringify(archive),
    });
    const copy = (await imported.json()) as { id: string; missingMedia: number };
    expect([imported.status, copy.missingMedia]).toEqual([201, 0]);
    expect(copy.id).not.toBe(id);
    expect((await fetch(`${base}/media/${copy.id}/afixture001.png`)).status).toBe(200);
    const tampered = {
      ...archive,
      media: { 'afixture001.png': Buffer.from('<svg onload="x">').toString('base64') },
    };
    const refused = await fetch(`${base}/api/projects/import`, {
      method: 'POST',
      headers: H,
      body: JSON.stringify(tampered),
    });
    expect(((await refused.json()) as { missingMedia: number }).missingMedia).toBe(1);
    const notArchive = await fetch(`${base}/api/projects/import`, { method: 'POST', headers: H, body: '{}' });
    expect(notArchive.status).toBe(400);
  });
});

describe('site templates (CS-02)', () => {
  type Template = { id: string; name: string; pages: number; builtIn: boolean };
  const templates = async () => (await (await fetch(`${base}/api/templates`)).json()) as Template[];
  const fromTemplate = (id: string, name = '') =>
    fetch(`${base}/api/templates/${id}/projects`, {
      method: 'POST',
      headers: H,
      body: JSON.stringify({ name }),
    });

  it('creates a complete project from the built-in template, media included', async () => {
    expect(await templates()).toContainEqual(
      expect.objectContaining({ id: 'atelier-nord', builtIn: true, pages: 5 }),
    );
    const res = await fromTemplate('atelier-nord', 'Mon atelier');
    const { id, missingMedia } = (await res.json()) as { id: string; missingMedia: number };
    expect([res.status, missingMedia]).toEqual([201, 0]);
    const created = (await site(id)) as {
      name: string;
      pages: unknown[];
      assets: Record<string, { file: string }>;
    };
    expect([created.name, created.pages.length]).toEqual(['Mon atelier', 5]);
    const first = Object.values(created.assets)[0];
    expect((await fetch(`${base}/media/${id}/${first?.file}`)).status).toBe(200);
  });

  it('saves a project as a template, reusable then deletable; built-in templates are protected', async () => {
    const { id } = await create(await fixture('layouts'));
    const saved = await fetch(`${base}/api/projects/${id}/template`, {
      method: 'POST',
      headers: H,
      body: JSON.stringify({ name: 'Mon modèle', description: 'Quatre pages' }),
    });
    const templateId = ((await saved.json()) as { id: string }).id;
    expect(await templates()).toContainEqual(
      expect.objectContaining({ id: templateId, name: 'Mon modèle', builtIn: false }),
    );
    expect((await fromTemplate(templateId)).status).toBe(201);
    expect(
      (await fetch(`${base}/api/templates/${templateId}`, { method: 'DELETE', headers: H })).status,
    ).toBe(200);
    expect((await templates()).some((t) => t.id === templateId)).toBe(false);
    expect((await fetch(`${base}/api/templates/atelier-nord`, { method: 'DELETE', headers: H })).status).toBe(
      403,
    );
    expect((await fromTemplate('..%2F..%2Fetc')).status).toBe(400);
    expect((await fromTemplate('inconnu')).status).toBe(404);
  });
});

describe('command catalog (CS-10)', () => {
  it('publishes the business commands as MCP-shaped tools', async () => {
    const tools = (await (await fetch(`${base}/api/commands`)).json()) as {
      name: string;
      inputSchema: unknown;
      permission: string;
    }[];
    expect(tools.find((t) => t.name === 'updateNodeProps')).toMatchObject({
      permission: 'content',
      inputSchema: { type: 'object' },
    });
    expect(tools.length).toBeGreaterThan(30);
  });
});

describe('AI assistant API (ADR-0014)', () => {
  it('reports its status without any key, answers within the contract, refuses invalid requests', async () => {
    const status = await (await fetch(`${base}/api/ai/status`)).json();
    expect(status).toMatchObject({ enabled: true, provider: 'simulated' });
    expect(JSON.stringify(status)).not.toContain('sk-test');
    const ask = (body: unknown) =>
      fetch(`${base}/api/ai/complete`, { method: 'POST', headers: H, body: JSON.stringify(body) });
    const ok = await ask({ system: 'x', messages: [{ role: 'user', content: 'Bonjour' }], maxTokens: 100 });
    expect([ok.status, ((await ok.json()) as { text: string }).text]).toEqual([
      200,
      'Proposition simulée : Bonjour',
    ]);
    expect((await ask({ system: 'x', messages: [], maxTokens: 100 })).status).toBe(400);
    expect(
      (await ask({ system: 'x', messages: [{ role: 'system', content: 'x' }], maxTokens: 100 })).status,
    ).toBe(400);
  });

  it('is disabled without configuration (503), and exports never contain keys', async () => {
    const off = createApi({ dataDir: join(dir, 'off'), exportsDir: join(dir, 'exports-off') });
    const server = createServer((req, res) => off(req, res, () => res.writeHead(404).end()));
    await new Promise<void>((ok) => server.listen(0, '127.0.0.1', ok));
    const addr = server.address();
    const url = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`;
    const res = await fetch(`${url}/api/ai/complete`, {
      method: 'POST',
      headers: H,
      body: JSON.stringify({ system: 'x', messages: [{ role: 'user', content: 'x' }], maxTokens: 10 }),
    });
    expect(res.status).toBe(503);
    expect(((await (await fetch(`${url}/api/ai/status`)).json()) as { enabled: boolean }).enabled).toBe(
      false,
    );
    server.close();
    const { id } = await create(await fixture('elements'));
    const exported = await fetch(`${base}/api/projects/${id}/export`, {
      method: 'POST',
      headers: H,
      body: JSON.stringify({ site: await site(id) }),
    });
    const { path } = (await exported.json()) as { path: string };
    for (const f of await readdir(path, { recursive: true })) {
      const file = join(path, f);
      if (!/\.(json|mjs|ts|tsx|astro|md|css)$/.test(f) || f.includes('node_modules')) continue;
      expect(await readFile(file, 'utf8'), f).not.toMatch(/sk-test|API_KEY|NS_AI_/);
    }
  });
});

describe('export download (ADR-0015)', () => {
  it('serves an export as a .tar.gz without dependencies; unknown or malformed names are refused', async () => {
    const { id } = await create(await fixture('elements'));
    const res = await fetch(`${base}/api/projects/${id}/export`, {
      method: 'POST',
      headers: H,
      body: JSON.stringify({ site: await site(id) }),
    });
    const { download } = (await res.json()) as { download: string };
    expect(download).toMatch(new RegExp(`^${id}-[0-9T-]{19}$`));
    const archive = await fetch(`${base}/api/exports/${download}.tar.gz`);
    expect([archive.status, archive.headers.get('content-type')]).toEqual([200, 'application/gzip']);
    const file = join(dir, 'export.tar.gz');
    await writeFile(file, Buffer.from(await archive.arrayBuffer()));
    const entries = execFileSync('tar', ['-tzf', file], { encoding: 'utf8' }).split('\n');
    expect(entries).toContain(`${download}/package.json`);
    expect(entries.some((e) => e.includes('node_modules'))).toBe(false);
    expect((await fetch(`${base}/api/exports/${id}-2000-01-01T00-00-00.tar.gz`)).status).toBe(404);
    expect((await fetch(`${base}/api/exports/..%2F..%2Fdata.tar.gz`)).status).toBe(404);
  });
});
