// Fidelity bench (ADR-0002, VE-12): renders each fixture in the real canvas
// (react-dom client) and in its Astro export built outside the repo from the
// template lockfile, then compares DOM, computed styles, boxes and pixels.
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { registry } from '@ns/components/definitions';
import { loadSite, pagePath, pageRoots, type Site, subtree } from '@ns/core';
import { generatePageFiles } from '@ns/export-astro';
import { chromium, type Page } from 'playwright';
import { exportProject, mediaFiles, readViews, writeFiles } from '../../packages/export-astro/src/write.ts';
import { serve } from '../serve.ts';
import { accessibility, diffStyles, imagesLoaded, loadedFonts, shot, snapshot } from './compare.ts';

const repo = join(import.meta.dirname, '../..');
const WIDTHS = [1280, 1023, 767, 420];
const MEDIA = join(repo, 'fixtures/media');

const run = (cmd: string, args: string[], cwd: string) =>
  execFileSync(cmd, args, { cwd, stdio: 'pipe' }).toString();

/**
 * Tabs on the built export (SB-07): keyboard operation with JavaScript (ARIA tabs pattern), and
 * graceful degradation without it (every panel readable with its title, no tab list).
 */
async function interactionChecks(url: string): Promise<string[]> {
  const problems: string[] = [];
  const page = await browser.newPage();
  await page.goto(`${url}/`);
  const tabs = page.getByRole('tab');
  await tabs.first().focus();
  await page.keyboard.press('ArrowRight');
  if ((await tabs.nth(1).getAttribute('aria-selected')) !== 'true') problems.push('flèche droite sans effet');
  if (!(await page.evaluate(() => document.activeElement?.getAttribute('role') === 'tab')))
    problems.push('focus perdu');
  if ((await page.getByRole('tabpanel').count()) !== 1) problems.push('un seul panneau attendu');
  await page.keyboard.press('End');
  if ((await tabs.last().getAttribute('aria-selected')) !== 'true') problems.push('touche Fin sans effet');
  await page.close();
  const noJs = await browser.newContext({ javaScriptEnabled: false });
  const plain = await noJs.newPage();
  await plain.goto(`${url}/`);
  if (await plain.locator('[role="tablist"]').isVisible()) problems.push('liste d’onglets visible sans JS');
  const titles = plain.locator('.ns-tab-title');
  for (let i = 0; i < (await titles.count()); i++) {
    if (!(await titles.nth(i).isVisible())) problems.push(`titre ${i + 1} masqué sans JS`);
  }
  if ((await plain.locator('.ns-tab:visible').count()) !== (await titles.count()))
    problems.push('panneaux masqués sans JS');
  if (!(await plain.locator('.ns-video a[href^="https://www.youtube.com/watch"]').isVisible()))
    problems.push('vidéo : lien de repli absent sans JS');
  await noJs.close();
  return problems;
}

/**
 * Gallery zoom on the built export (ADR-0021): a click opens the image in a modal dialog, arrows go
 * to the next one, Escape closes and gives the focus back; without JavaScript the link opens the image.
 */
async function galleryChecks(url: string): Promise<string[]> {
  const problems: string[] = [];
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(`${url}/`);
  const links = page.locator('.ns-gallery-link');
  await links.first().scrollIntoViewIfNeeded();
  await links.first().click();
  const dialog = page.locator('dialog.ns-lightbox[open]');
  if (!(await dialog.isVisible())) problems.push('agrandissement non ouvert');
  const src = () => dialog.locator('img').evaluate((img) => (img as HTMLImageElement).src);
  const href = (i: number) => links.nth(i).evaluate((a) => (a as HTMLAnchorElement).href);
  if ((await src()) !== (await href(0))) problems.push('image agrandie différente du lien');
  await page.keyboard.press('ArrowRight');
  if ((await src()) !== (await href(1))) problems.push('flèche droite sans effet');
  if (!(await dialog.locator('figcaption').isHidden())) problems.push('légende vide affichée (image 2)');
  if (
    !(await dialog
      .locator('img')
      .evaluate((img) => (img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth > 0))
  )
    problems.push('image agrandie non chargée');
  await page.keyboard.press('Escape');
  await page
    .locator('dialog.ns-lightbox')
    .waitFor({ state: 'detached', timeout: 2000 })
    .catch(() => {});
  if (await page.locator('dialog.ns-lightbox').count()) problems.push('Échap ne ferme pas');
  if (!(await page.evaluate(() => document.activeElement?.classList.contains('ns-gallery-link'))))
    problems.push('focus non rendu au lien');
  await page.close();
  const noJs = await browser.newContext({ javaScriptEnabled: false });
  const plain = await noJs.newPage();
  await plain.goto(`${url}/`);
  const fallback = await plain.locator('.ns-gallery-link').first().getAttribute('href');
  if (!fallback || !(await plain.request.get(new URL(fallback, `${url}/`).href)).ok())
    problems.push('lien de repli sans JS cassé');
  await noJs.close();
  return problems;
}

/**
 * Marquee and carousel on the built export (ADR-0022): the marquee scrolls and pauses with its
 * button, stands still with reduced motion; the carousel buttons scroll the track, looping at the start.
 */
async function motionChecks(url: string, doc: Site): Promise<string[]> {
  const problems: string[] = [];
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(`${url}/`);
  if (Object.values(doc.nodes).some((n) => n.type === 'marquee')) {
    const marquee = page.locator('[data-ns-marquee]').first();
    const running = () =>
      marquee
        .locator('.ns-marquee-track')
        .evaluate((t) => t.getAnimations().some((a) => a.playState === 'running'));
    if (!(await running())) problems.push('bandeau immobile');
    const toggle = marquee.locator('.ns-marquee-toggle');
    await toggle.click();
    if ((await toggle.getAttribute('aria-pressed')) !== 'true' || (await running()))
      problems.push('le bouton ne met pas en pause');
    const reduced = await browser.newPage({ reducedMotion: 'reduce' });
    await reduced.goto(`${url}/`);
    const still = reduced.locator('[data-ns-marquee]').first();
    if (await still.locator('.ns-marquee-track').evaluate((t) => t.getAnimations().length > 0))
      problems.push('bandeau animé en mouvement réduit');
    if (await still.locator('.ns-marquee-toggle').isVisible()) problems.push('bouton pause inutile affiché');
    if (await still.locator('.ns-marquee-group[aria-hidden]').isVisible())
      problems.push('copie visible en mouvement réduit');
    await reduced.close();
  }
  if (Object.values(doc.nodes).some((n) => n.type === 'carousel')) {
    const carousel = page.locator('[data-ns-carousel]').first();
    const track = carousel.locator('.ns-carousel-track');
    const left = () => track.evaluate((t) => t.scrollLeft);
    await carousel.scrollIntoViewIfNeeded();
    await carousel.locator('.ns-carousel-next').click();
    await page
      .waitForFunction((el) => (el as HTMLElement).scrollLeft > 0, await track.elementHandle(), {
        timeout: 2000,
      })
      .catch(() => {});
    if (!((await left()) > 0)) problems.push('« suivant » sans effet');
    await track.evaluate((t) => t.scrollTo({ left: 0, behavior: 'instant' }));
    await carousel.locator('.ns-carousel-prev').click();
    await page
      .waitForFunction((el) => (el as HTMLElement).scrollLeft > 0, await track.elementHandle(), {
        timeout: 2000,
      })
      .catch(() => {});
    if (!((await left()) > 0)) problems.push('« précédent » ne reboucle pas');
  }
  await page.close();
  return problems;
}

/**
 * Animations on the built export (ADR-0012): an in-view entrance holds its starting state until it
 * scrolls into view, then plays; nothing animates or hides with reduced motion or without JavaScript.
 */
async function animationChecks(url: string): Promise<string[]> {
  const problems: string[] = [];
  const card = '.ns-nstkcard10';
  const opacity = (page: Page) => page.locator(card).evaluate((el) => getComputedStyle(el).opacity);
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(`${url}/`);
  await page.waitForTimeout(100);
  if ((await opacity(page)) !== '0')
    problems.push(`carte visible avant le défilement (opacité ${await opacity(page)})`);
  await page.locator(card).scrollIntoViewIfNeeded();
  await page.waitForTimeout(1200);
  if ((await opacity(page)) !== '1')
    problems.push(`carte non révélée après le défilement (opacité ${await opacity(page)})`);
  await page.locator('.ns-nbtnanim01').hover();
  await page.waitForTimeout(400);
  const transform = await page.locator('.ns-nbtnanim01').evaluate((el) => getComputedStyle(el).transform);
  if (!transform.startsWith('matrix(1.05')) problems.push(`survol sans effet (${transform})`);
  await page.close();
  for (const [label, options] of [
    ['mouvement réduit', { reducedMotion: 'reduce' as const }],
    ['sans JavaScript', { javaScriptEnabled: false }],
  ] as const) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, ...options });
    const plain = await context.newPage();
    await plain.goto(`${url}/`);
    await plain.waitForTimeout(100);
    if ((await opacity(plain)) !== '1') problems.push(`${label} : contenu masqué`);
    if (label === 'mouvement réduit' && (await plain.evaluate(() => document.getAnimations().length)) > 0)
      problems.push('mouvement réduit : animations jouées');
    await context.close();
  }
  return problems;
}

// 1. Fixtures
const fixtureFiles = (await readdir(join(repo, 'fixtures'))).filter((f) => f.endsWith('.json')).sort();
const docs: Site[] = [];
for (const f of fixtureFiles) {
  const r = loadSite(JSON.parse(await readFile(join(repo, 'fixtures', f), 'utf8')), registry);
  if (!r.ok) throw new Error(`${f}: ${JSON.stringify(r.diagnostics)}`);
  docs.push(r.doc);
}
const first = docs[0];
if (!first) throw new Error('No fixtures');

// 2. Canvas build, export installed from the lockfile outside the repo, one Astro build per fixture
console.log('Build du canvas…');
run('npm', ['run', 'build', '-w', '@ns/studio'], repo);
const work = await mkdtemp(join(tmpdir(), 'ns-fidelity-'));
const site = join(work, 'site');
await exportProject(first, registry, site, { mediaDirs: [MEDIA] });
console.log(`npm ci dans ${site}…`);
run('npm', ['ci', '--no-audit', '--no-fund'], site);
const outDirs: Record<string, string> = {};
for (const doc of docs) {
  await rm(join(site, 'src'), { recursive: true, force: true });
  await rm(join(site, 'public'), { recursive: true, force: true });
  await writeFiles(site, {
    ...generatePageFiles(doc, registry, await readViews(doc)),
    ...(await mediaFiles(doc, registry, [MEDIA])),
  });
  outDirs[doc.id] = join(work, 'out', doc.id);
  await mkdir(outDirs[doc.id] as string, { recursive: true });
  run(join(site, 'node_modules/.bin/astro'), ['build', '--outDir', outDirs[doc.id] as string], site);
  console.log(`Export construit : ${doc.id}`);
}

// 3. Compare
const canvas = await serve(join(repo, 'apps/studio/dist'), { mounts: { '/media/': MEDIA } });
const browser = await chromium.launch();
const rows: string[] = [];
const details: string[] = [];
let failures = 0;
for (const doc of docs) {
  const out = outDirs[doc.id] as string;
  const exported = await serve(out);
  const importedFamilies = [
    ...new Set(Object.values(doc.assets).flatMap((a) => (a.kind === 'font' ? [a.family] : []))),
  ];
  // Every published page (multipage bench), header and footer included.
  for (const sitePage of doc.pages.filter((p) => p.publish)) {
    const path = pagePath(sitePage.slug);
    const label = sitePage.slug ? `${doc.id} ${path}` : doc.id;
    const scripts = ((await readFile(join(out, path, 'index.html'), 'utf8')).match(/<script/g) ?? []).length;
    // JavaScript only for pages with interactive components (islands), never otherwise.
    const interactive = pageRoots(doc, sitePage.id)
      .flatMap((r) => subtree(doc, r))
      .some(
        (id) =>
          registry.get(doc.nodes[id]?.type ?? '')?.island ||
          doc.nodes[id]?.animations?.some((a) => a.trigger !== 'hover' && a.trigger !== 'focus'),
      );
    const scriptsOk = interactive ? scripts > 0 : scripts === 0;
    for (const width of WIDTHS) {
      // Tall viewport so that lazy images load in both renderings; fixtures use no vh units.
      const page = await browser.newPage({ viewport: { width, height: 2400 } });
      // Final state compared (ADR-0012): reduced motion, so animations neither run nor hide content.
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(`${exported.url}${path}`);
      await imagesLoaded(page);
      const fontsA = await loadedFonts(page);
      const a = await snapshot(page);
      const shotA = await shot(page);
      const a11y = await accessibility(page);
      // No horizontal scrolling at any width (CS-04: composition without breaking the responsive).
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      await page.goto(`${canvas.url}/canvas.html`);
      // The canvas re-validates the document; `unknown` avoids Playwright's deep recursive arg typing.
      const reply = await page.evaluate(
        (arg: unknown) =>
          new Promise<{ type: string }>((resolve) => {
            addEventListener('message', (e) => {
              if (e.data?.type === 'rendered' || e.data?.type === 'error') resolve(e.data);
            });
            const { site, pageId } = arg as { site: unknown; pageId: string };
            postMessage({ type: 'render', doc: site, pageId }, '*');
          }),
        { site: doc, pageId: sitePage.id } as unknown,
      );
      if (reply.type !== 'rendered') throw new Error(`Canvas a refusé ${doc.id}: ${JSON.stringify(reply)}`);
      await imagesLoaded(page);
      const fontsB = await loadedFonts(page);
      const b = await snapshot(page);
      const shotB = await shot(page);
      await page.close();
      const dom = a.html === b.html;
      const styles = diffStyles(a, b);
      const pixels = shotA.equals(shotB);
      // Imported fonts really used on both sides, not a silent fallback to a system font.
      const fontsOk = fontsA.join() === fontsB.join() && fontsA.length >= importedFamilies.length;
      if (!fontsOk)
        details.push(`- ${label} @${width} polices chargées : export ${fontsA} ; canvas ${fontsB}`);
      const ok = dom && !styles.length && pixels && scriptsOk && !a11y.length && overflow <= 0 && fontsOk;
      if (overflow > 0) details.push(`- ${label} @${width} : défilement horizontal de ${overflow}px`);
      if (!ok) failures++;
      rows.push(
        `| ${label} | ${width} | ${dom ? 'identique' : '**différent**'} | ${styles.length}/${a.elements.length} | ${pixels ? 'identiques' : '**différents**'} | ${scripts} | ${a11y.length ? `**${a11y.map((v) => `${v.id} (${v.impact}, ${v.count})`).join(', ')}**` : 'aucune'} |`,
      );
      if (!dom) {
        // Context around the first difference.
        let at = 0;
        while (a.html[at] === b.html[at]) at++;
        const around = (h: string) => h.slice(Math.max(0, at - 120), at + 180);
        details.push(
          `- ${label} @${width} DOM (caractère ${at}) :\n  export : …${around(a.html)}\n  canvas : …${around(b.html)}`,
        );
      }
      for (const s of styles.slice(0, 5)) details.push(`- ${label} @${width} ${s}`);
    }
  }
  if (Object.values(doc.nodes).some((n) => n.animations?.length)) {
    const problems = await animationChecks(exported.url);
    for (const p of problems) details.push(`- ${doc.id} animations : ${p}`);
    if (problems.length) failures++;
    rows.push(
      `| ${doc.id} | animations | entrée au défilement, mouvement réduit, sans JS | | ${problems.length ? '**échec**' : 'conformes'} | | |`,
    );
  }
  if (Object.values(doc.nodes).some((n) => n.type === 'gallery')) {
    const problems = await galleryChecks(exported.url);
    for (const p of problems) details.push(`- ${doc.id} galerie : ${p}`);
    if (problems.length) failures++;
    rows.push(
      `| ${doc.id} | galerie | agrandissement, clavier, Échap, sans JS | | ${problems.length ? '**échec**' : 'conformes'} | | |`,
    );
  }
  if (Object.values(doc.nodes).some((n) => n.type === 'marquee' || n.type === 'carousel')) {
    const problems = await motionChecks(exported.url, doc);
    for (const p of problems) details.push(`- ${doc.id} bandeau/carrousel : ${p}`);
    if (problems.length) failures++;
    rows.push(
      `| ${doc.id} | bandeau, carrousel | défilement, pause, mouvement réduit, boutons | | ${problems.length ? '**échec**' : 'conformes'} | | |`,
    );
  }
  if (Object.values(doc.nodes).some((n) => n.type === 'tabs')) {
    const problems = await interactionChecks(exported.url);
    for (const p of problems) details.push(`- ${doc.id} interaction : ${p}`);
    if (problems.length) failures++;
    rows.push(
      `| ${doc.id} | interactions | clavier avec JS, lecture sans JS | | ${problems.length ? '**échec**' : 'conformes'} | | |`,
    );
  }
  exported.server.close();
}
await browser.close();
canvas.server.close();
await rm(work, { recursive: true, force: true });

const report = [
  `# Rapport de fidélité — ${new Date().toISOString()}`,
  '',
  `Chromium ${browser.version()} · ${docs.length} fixtures, ${docs.reduce((n, d) => n + d.pages.filter((p) => p.publish).length, 0)} pages × ${WIDTHS.length} largeurs`,
  '',
  '| Fixture | Largeur | DOM normalisé | Éléments à style/boîte différent | Pixels | `<script>` exportés | Violations a11y graves (axe, WCAG 2.1 AA) |',
  '|---|---|---|---|---|---|---|',
  ...rows,
  '',
  ...(details.length ? ['## Écarts', '', ...details] : ['Aucun écart.']),
  '',
].join('\n');
await mkdir(join(repo, 'test-results'), { recursive: true });
await writeFile(join(repo, 'test-results/fidelity-report.md'), report);
console.log(`\n${report}`);
process.exit(failures ? 1 : 0);
