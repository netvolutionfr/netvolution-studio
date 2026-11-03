// Acceptance of the built-in site templates (CS-02): each one becomes a project, is exported with
// its static build, then every page is checked in a browser at desktop and mobile widths:
// accessibility (axe, serious violations), no horizontal scrolling, no JavaScript error, imported
// fonts loaded. Screenshots in test-results/templates/ for review. Usage: npm run templates:check
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { createApi } from '../../apps/studio/dev-server/api.ts';
import { accessibility } from '../fidelity/compare.ts';
import { serve } from '../serve.ts';

const repo = join(import.meta.dirname, '../..');
const only = process.argv.slice(2);
const out = join(repo, 'test-results/templates');
await mkdir(out, { recursive: true });
const work = await mkdtemp(join(tmpdir(), 'ns-templates-'));
const api = await serve(join(work, 'empty'), {
  middleware: createApi({
    dataDir: join(work, 'data'),
    templatesDir: join(repo, 'templates'),
    exportsDir: join(work, 'exports'),
  }),
});
const H = { 'x-ns-request': '1', 'content-type': 'application/json' };
const browser = await chromium.launch();
const problems: string[] = [];
try {
  const templates = (
    (await (await fetch(`${api.url}/api/templates`)).json()) as { id: string; name: string }[]
  ).filter((t) => !only.length || only.includes(t.id));
  for (const t of templates) {
    console.log(`→ ${t.name}`);
    const created = (await (
      await fetch(`${api.url}/api/templates/${t.id}/projects`, { method: 'POST', headers: H, body: '{}' })
    ).json()) as { id: string };
    const site = await (await fetch(`${api.url}/api/projects/${created.id}`)).json();
    const exported = await fetch(`${api.url}/api/projects/${created.id}/export`, {
      method: 'POST',
      headers: H,
      body: JSON.stringify({ site, build: true }),
    });
    if (!exported.ok) throw new Error(`${t.id} : export refusé ${await exported.text()}`);
    const { staticPath } = (await exported.json()) as { staticPath: string };
    const server = await serve(staticPath);
    const families = new Set(
      Object.values(site.assets as Record<string, { kind: string; family?: string }>).flatMap((a) =>
        a.kind === 'font' && a.family ? [a.family] : [],
      ),
    );
    for (const pg of site.pages as { slug: string; title: string }[]) {
      for (const width of [1440, 390]) {
        const page = await browser.newPage({ viewport: { width, height: 900 } });
        const errors: string[] = [];
        page.on('pageerror', (e) => errors.push(e.message));
        await page.goto(`${server.url}/${pg.slug ? `${pg.slug}/` : ''}`);
        // Entrances appear on scroll: scroll to the end so the screenshot shows the whole page.
        for (let y = 0; y < 30_000; y += 600) {
          await page.evaluate((top) => scrollTo(0, top), y);
          await page.waitForTimeout(60);
          if (await page.evaluate((top) => top > document.body.scrollHeight, y)) break;
        }
        await page.waitForTimeout(900);
        await page.evaluate(() => document.fonts.ready);
        const loaded = await page.evaluate(() =>
          [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family),
        );
        const missing = [...families].filter((f) => !loaded.includes(f));
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
        const a11y = await accessibility(page);
        await page.screenshot({
          path: join(out, `${t.id}-${pg.slug || 'accueil'}-${width}.png`),
          fullPage: true,
        });
        const label = `${t.id} /${pg.slug} @${width}`;
        if (overflow > 0) {
          // The deepest elements sticking out on the right, to find the culprit quickly.
          const culprits = await page.evaluate(() =>
            [...document.querySelectorAll('body *')]
              .filter((el) => el.getBoundingClientRect().right > innerWidth + 1 && !el.querySelector('*'))
              .slice(0, 3)
              .map(
                (el) =>
                  `${el.tagName.toLowerCase()}.${el.className} « ${(el.textContent ?? '').slice(0, 30)} »`,
              ),
          );
          problems.push(`${label} : défilement horizontal de ${overflow} px (${culprits.join(' ; ')})`);
        }
        if (a11y.length) problems.push(`${label} : ${a11y.map((v) => `${v.id} (${v.count})`).join(', ')}`);
        if (errors.length) problems.push(`${label} : ${errors.join(' ; ')}`);
        if (missing.length) problems.push(`${label} : polices non chargées ${missing.join(', ')}`);
        await page.close();
      }
    }
    server.server.close();
  }
} finally {
  await browser.close();
  api.server.close();
  await rm(work, { recursive: true, force: true });
}
console.log(problems.length ? problems.map((p) => `✗ ${p}`).join('\n') : 'Tous les modèles passent.');
console.log(`Captures dans ${out}`);
if (problems.length) process.exit(1);
