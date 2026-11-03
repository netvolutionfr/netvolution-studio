// Milestone 3 demonstration (03-creative-studio.md §5), fully reproducible: starting from the
// milestone 2 site (template « Atelier Nord »), through the Studio UI only: a hero section from the
// library, edited, saved as a shared component and reused on another page, an entrance animation,
// the mobile layout, an AI proposal (simulated provider: deterministic, no network) reviewed,
// accepted, undone and redone; then exported with its static build, served with the Studio stopped,
// and verified: animations (in view, reduced motion, without JavaScript), responsive, accessibility,
// weight of each page, and no secret in the exported files.
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium, type Page } from 'playwright';
import { aiConfigFromEnv } from '../../apps/studio/dev-server/ai/service.ts';
import { createApi } from '../../apps/studio/dev-server/api.ts';
import { accessibility } from '../fidelity/compare.ts';
import { serve } from '../serve.ts';

const repo = join(import.meta.dirname, '../..');
const results: string[] = [];
const step = (s: string) => console.log(`→ ${s}`);
const fail = (message: string): never => {
  throw new Error(message);
};
/** A key configured on the server during the demonstration: it must appear in no exported file. */
const SECRET = 'sk-ant-DEMO-NE-JAMAIS-EXPORTER';
const PAGES = [
  { title: 'Accueil', slug: '' },
  { title: 'Présentation', slug: 'presentation' },
  { title: 'Services', slug: 'services' },
  { title: 'Réalisations', slug: 'realisations' },
  { title: 'Contact', slug: 'contact' },
];
/**
 * Bounds of the demonstration site, set from its measures on 30/10/2026 with a margin: they catch a
 * regression (a dependency or a script added to every page), they promise nothing for other sites.
 */
const BUDGET = { html: 40_000, css: 30_000, js: 15_000, total: 1_500_000, requests: 20 };
const TITLE = 'Un atelier à votre écoute';

step('Build du Studio');
execFileSync('npm', ['run', 'build', '-w', '@ns/studio'], { cwd: repo, stdio: 'pipe' });
const work = await mkdtemp(join(tmpdir(), 'ns-demo-creative-'));
const api = createApi({
  dataDir: join(work, 'data'),
  templatesDir: join(repo, 'templates'),
  exportsDir: join(work, 'exports'),
  ai: aiConfigFromEnv({ NS_AI_PROVIDER: 'simulated', ANTHROPIC_API_KEY: SECRET }),
});
const app = await serve(join(repo, 'apps/studio/dist'), { middleware: api });
const browser = await chromium.launch();
// A French browser: the Studio opens in French (ADR-0024), the language of these scenarios.
const page = await browser.newPage({ locale: 'fr-FR', viewport: { width: 1600, height: 1000 } });
page.on('dialog', (d) => void d.accept());
const errors: string[] = [];
page.on('pageerror', (e) => errors.push(e.message));
const canvas = page.frameLocator('iframe[title="Aperçu de la page"]');
const library = page.locator('.library');
const row = (label: string) =>
  page
    .locator('.tree-row')
    .filter({ has: page.locator('.tree-label', { hasText: new RegExp(`^${label}$`) }) });
const openPage = async (title: string) => {
  await page.locator('.pages .pages-list').first().locator('.pages-item', { hasText: title }).first().click();
  await page.keyboard.press('Escape');
};
const fill = async (label: string, value: string) => {
  const input = page.getByLabel(label, { exact: true });
  await input.fill(value);
  await input.blur();
};
/** The hero in the canvas: the stack two levels above its title. */
const heroStyle = (property: 'backgroundColor' | 'flexDirection') =>
  canvas
    .getByRole('heading', { name: TITLE })
    .evaluate((el, p) => getComputedStyle(el.parentElement?.parentElement as Element)[p], property);
async function until<T>(probe: () => Promise<T>, expected: T, message: string) {
  let last: T | undefined;
  for (const end = Date.now() + 3000; Date.now() < end; await new Promise((r) => setTimeout(r, 50))) {
    last = await probe();
    if (last === expected) return;
  }
  fail(`${message} : attendu ${String(expected)}, obtenu ${String(last)}`);
}

let staticServer: { close(): void } | undefined;
try {
  step('Site du jalon 2 : projet créé depuis le modèle « Atelier Nord »');
  await page.goto(`${app.url}/`);
  await page.getByLabel('Nom du projet').fill('Atelier Nord créatif');
  await page.getByLabel('Modèle').selectOption({ label: 'Atelier Nord — site vitrine (5 pages)' });
  await page.getByRole('button', { name: 'Créer le projet' }).click();
  await page.locator('.pages').waitFor({ timeout: 5000 });

  step('1. Section « Hero » insérée depuis la bibliothèque (page Présentation)');
  await openPage('Présentation');
  await library.getByRole('radio', { name: 'Sections' }).click();
  await library
    .getByRole('listitem', { name: 'Hero', exact: true })
    .getByRole('button', { name: 'Insérer', exact: true })
    .click();
  await library.getByRole('radio', { name: 'Composants' }).click();
  await canvas.getByRole('heading', { name: 'Votre titre principal' }).waitFor({ timeout: 3000 });

  step('2. Paramètres et couleurs : titre, niveau, fond');
  await canvas.getByRole('heading', { name: 'Votre titre principal' }).click();
  await fill('Texte', TITLE);
  await page.getByLabel('Niveau', { exact: true }).selectOption({ label: 'H2' });
  await row('Hero').click();
  await fill('Couleur de fond', '#eef2ff');
  await until(() => heroStyle('backgroundColor'), 'rgb(238, 242, 255)', 'fond du hero');

  step('3. Composition enregistrée comme composant réutilisable « Hero atelier »');
  await page.getByRole('button', { name: 'Créer un composant réutilisable' }).click();
  const create = page.getByRole('dialog', { name: 'Créer un composant' });
  await create.getByLabel('Nom').fill('Hero atelier');
  await create.getByLabel('Catégorie').selectOption({ label: 'Hero' });
  await create.getByRole('button', { name: 'Créer' }).click();
  await page.getByText('Version 1 (à jour)').waitFor({ timeout: 3000 });

  step('4. Réutilisé, lié, sur la page Services');
  await openPage('Services');
  await library.getByRole('radio', { name: 'Sections' }).click();
  await library.getByRole('button', { name: 'Insérer « Hero atelier » liée' }).click();
  await library.getByRole('radio', { name: 'Composants' }).click();
  await canvas.getByRole('heading', { name: TITLE }).waitFor({ timeout: 3000 });

  step('5. Animation d’entrée « à l’apparition » sur le hero (Présentation)');
  await openPage('Présentation');
  await row('Hero').click();
  const motion = page.locator('.ui-section', { hasText: 'Ajouter une animation' });
  await motion.getByRole('button', { name: 'Ajouter une animation' }).click();
  await motion.getByLabel('Déclencheur').waitFor({ timeout: 2000 });

  step('6. Comportement mobile : le hero passe en colonne à 390 px');
  await page.getByRole('radio', { name: 'Mobile' }).click();
  await until(() => heroStyle('flexDirection'), 'column', 'hero en colonne sur mobile');
  await page.getByRole('radio', { name: 'Desktop' }).click();
  await until(() => heroStyle('flexDirection'), 'row', 'hero en ligne sur desktop');

  step('7. L’IA propose une variante plus sobre du hero');
  await row('Hero').click();
  await page.getByRole('button', { name: 'Assistant IA' }).click();
  await page.getByRole('button', { name: 'Variante sobre' }).click();
  await page.getByRole('button', { name: 'Proposer' }).click();

  step('8. Examen des modifications proposées');
  const review = page.getByRole('dialog', { name: 'Proposition de l’assistant' });
  await review
    .waitFor({ timeout: 5000 })
    .catch(async () => fail(`aucune proposition : ${await page.locator('.assistant').textContent()}`));
  const lines = await review
    .getByRole('list', { name: 'Changements proposés' })
    .locator('li')
    .allTextContents();
  if (
    !lines.some((l) => l.includes('backgroundColor (base)')) ||
    !lines.some((l) => l.includes('paddingTop'))
  )
    fail(`revue : ${lines.join(' | ')}`);
  if ((await heroStyle('backgroundColor')) !== 'rgb(238, 242, 255)') fail('appliqué avant acceptation');
  results.push(`- Proposition de l’IA examinée : ${lines.length} changement(s) — ${lines.join(' ; ')}.`);

  step('9. Proposition acceptée');
  await review.getByRole('button', { name: 'Accepter' }).click();
  await until(() => heroStyle('backgroundColor'), 'rgba(0, 0, 0, 0)', 'fond retiré');

  step('10. Annuler puis rétablir l’opération (une seule étape)');
  await page.getByRole('button', { name: 'Annuler' }).click();
  await until(() => heroStyle('backgroundColor'), 'rgb(238, 242, 255)', 'annulé');
  await page.getByRole('button', { name: 'Rétablir' }).click();
  await until(() => heroStyle('backgroundColor'), 'rgba(0, 0, 0, 0)', 'rétabli');
  await page.getByRole('button', { name: 'Journal des opérations' }).click();
  const journal = (await page.getByRole('list', { name: 'Journal des opérations' }).textContent()) ?? '';
  if (!journal.includes('IA') || journal.includes(TITLE)) fail(`journal : ${journal}`);

  step('11. Enregistrement, contrôles, export Astro et build statique');
  await page.keyboard.press('ControlOrMeta+s');
  await page.locator('.toolbar .status', { hasText: /^Enregistré$/ }).waitFor({ timeout: 5000 });
  await page.getByRole('button', { name: 'Plus d’actions' }).click();
  await page.getByRole('menuitem', { name: 'Exporter le site (Astro)…' }).click();
  const dialog = page.getByRole('dialog', { name: 'Exporter le site' });
  await dialog.getByText('Contrôles avant export').waitFor({ timeout: 5000 });
  if (await dialog.getByText(/erreur\(s\) bloquante/).count())
    fail(`erreurs bloquantes : ${(await dialog.locator('.checks li').allTextContents()).join(' | ')}`);
  await dialog.getByLabel(/Construire aussi le site statique/).check();
  await dialog.getByRole('button', { name: 'Exporter', exact: true }).click();
  const result = dialog.locator('.export-result');
  await result
    .waitFor({ timeout: 10 * 60_000 })
    .catch(async () => fail(`export : ${await dialog.textContent()}`));
  const [sourcesDir, staticDir] = (await result.locator('code').allTextContents()).map((t) => t.trim());
  if (!sourcesDir || !staticDir) fail('export incomplet');
  results.push(`- Sources Astro : \`${sourcesDir}\` ; site statique : \`${staticDir}\`.`);

  step('12. Studio arrêté ; site statique vérifié (animations, responsive, accessibilité, poids, secrets)');
  app.server.close();
  const site = await serve(staticDir as string);
  staticServer = site.server;
  // No secret nor AI configuration in any exported file (sources and build, dependencies excepted).
  const leaks: string[] = [];
  for (const dir of [sourcesDir, staticDir] as string[])
    for (const f of await readdir(dir, { recursive: true })) {
      if (f.includes('node_modules')) continue;
      const text = await readFile(join(dir, f)).then(
        (b) => b.toString('latin1'),
        () => '',
      );
      if (/sk-ant-|ANTHROPIC|NS_AI_|API_KEY/.test(text)) leaks.push(f);
    }
  if (leaks.length) fail(`secrets ou configuration IA exportés : ${leaks.join(', ')}`);
  results.push(
    '- Aucun secret ni configuration IA dans les sources et le build exportés (clé factice configurée sur le serveur).',
  );

  const visitor = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const pageErrors: string[] = [];
  visitor.on('pageerror', (e) => pageErrors.push(e.message));
  const rows: string[] = [];
  for (const p of PAGES) {
    // Cold load in a fresh context (empty cache): every resource of the page, inline scripts included.
    const bytes = { html: 0, css: 0, js: 0, total: 0, requests: 0 };
    const cold = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const probe = await cold.newPage();
    const pending: Promise<void>[] = [];
    probe.on('response', (r) =>
      pending.push(
        r.body().then(
          (body) => {
            const type = r.request().resourceType();
            const key =
              type === 'document' ? 'html' : type === 'stylesheet' ? 'css' : type === 'script' ? 'js' : null;
            if (key) bytes[key] += body.length;
            bytes.total += body.length;
            bytes.requests++;
          },
          () => {},
        ),
      ),
    );
    await probe.goto(`${site.url}/${p.slug ? `${p.slug}/` : ''}`, { waitUntil: 'networkidle' });
    await Promise.all(pending);
    const inline = (selector: string) =>
      probe.evaluate(
        (sel) => [...document.querySelectorAll(sel)].reduce((n, s) => n + (s.textContent?.length ?? 0), 0),
        selector,
      );
    bytes.js += await inline('script:not([src])');
    bytes.css += await inline('style');
    await cold.close();
    const res = await visitor.goto(`${site.url}/${p.slug ? `${p.slug}/` : ''}`);
    if (res?.status() !== 200) fail(`${p.title} : statut ${res?.status()}`);
    const a11y = await accessibility(visitor);
    if (a11y.length) fail(`${p.title} : violations axe ${JSON.stringify(a11y)}`);
    for (const width of [1280, 390]) {
      await visitor.setViewportSize({ width, height: 900 });
      if (await visitor.evaluate(() => document.documentElement.scrollWidth > innerWidth))
        fail(`${p.title} : défilement horizontal à ${width}px`);
    }
    await visitor.setViewportSize({ width: 1280, height: 900 });
    for (const key of Object.keys(BUDGET) as (keyof typeof BUDGET)[])
      if (bytes[key] > BUDGET[key]) fail(`${p.title} : ${key} ${bytes[key]} > ${BUDGET[key]}`);
    const kb = (n: number) => `${(n / 1024).toFixed(1)} Ko`;
    rows.push(
      `| ${p.title} | ${kb(bytes.html)} | ${kb(bytes.css)} | ${kb(bytes.js)} | ${kb(bytes.total)} | ${bytes.requests} | aucune |`,
    );
  }

  // The entrance: hidden until it scrolls into view, then revealed; the reused hero is on Services too.
  const hero = (p: Page) =>
    p
      .getByRole('heading', { name: TITLE })
      .evaluate((el) => getComputedStyle(el.parentElement?.parentElement as Element).opacity);
  await visitor.goto(`${site.url}/presentation/`);
  await visitor.waitForTimeout(100);
  const before = await hero(visitor);
  await visitor.getByRole('heading', { name: TITLE }).scrollIntoViewIfNeeded();
  await visitor.waitForTimeout(1200);
  const after = await hero(visitor);
  if (before !== '0' || after !== '1') fail(`animation d’entrée : opacité ${before} puis ${after}`);
  await visitor.screenshot({
    path: join(repo, 'test-results/demo-creative-presentation.png'),
    fullPage: true,
  });
  await visitor.goto(`${site.url}/services/`);
  await visitor.getByRole('heading', { name: TITLE }).waitFor({ timeout: 2000 });
  for (const [label, options] of [
    ['mouvement réduit', { reducedMotion: 'reduce' as const }],
    ['sans JavaScript', { javaScriptEnabled: false }],
  ] as const) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, ...options });
    const plain = await context.newPage();
    await plain.goto(`${site.url}/presentation/`);
    await plain.waitForTimeout(200);
    if ((await hero(plain)) !== '1') fail(`${label} : hero masqué`);
    if (label === 'mouvement réduit' && (await plain.evaluate(() => document.getAnimations().length)) > 0)
      fail('mouvement réduit : animations jouées');
    if (label === 'sans JavaScript')
      await plain.screenshot({ path: join(repo, 'test-results/demo-creative-390-nojs.png'), fullPage: true });
    await context.close();
  }
  site.server.close();
  if (pageErrors.length || errors.length)
    fail(`erreurs JavaScript : ${[...pageErrors, ...errors].join(' | ')}`);

  const report = [
    `# Démonstration du jalon 3 — ${new Date().toISOString()}`,
    '',
    'Depuis le site du jalon 2 (modèle « Atelier Nord »), uniquement dans l’interface du Studio : section Hero de la',
    'bibliothèque modifiée (titre, niveau, fond), enregistrée comme composant et réutilisée liée sur une autre page,',
    'animation d’entrée, vérification mobile, variante proposée par l’IA (fournisseur simulé) examinée, acceptée,',
    'annulée puis rétablie, export Astro et build statique.',
    '',
    ...results,
    '- Studio arrêté, site statique servi par un serveur HTTP de test (aucun service Netvolution).',
    '- Hero animé masqué avant le défilement puis révélé ; visible et immobile en mouvement réduit et sans JavaScript.',
    '- Aucun défilement horizontal à 1280 et 390 px ; aucune violation axe grave ; aucune erreur JavaScript.',
    '',
    `Poids transférés par page (bornes du site de démonstration : HTML ${BUDGET.html / 1000} Ko, CSS ${BUDGET.css / 1000} Ko, JS ${BUDGET.js / 1000} Ko, total ${BUDGET.total / 1_000_000} Mo, ${BUDGET.requests} requêtes ; chargement à froid) :`,
    '',
    '| Page | HTML | CSS (inline compris) | JS (inline compris) | Total (images comprises) | Requêtes | Violations a11y graves (axe) |',
    '|---|---|---|---|---|---|---|',
    ...rows,
    '',
    'Captures : `test-results/demo-creative-presentation.png`, `demo-creative-390-nojs.png`.',
    '',
  ].join('\n');
  await mkdir(join(repo, 'test-results'), { recursive: true });
  await writeFile(join(repo, 'test-results/demo-creative-report.md'), report);
  console.log(`\n${report}\nDémonstration réussie.`);
} catch (e) {
  await mkdir(join(repo, 'test-results'), { recursive: true });
  await page.screenshot({ path: join(repo, 'test-results/demo-creative-failure.png') }).catch(() => {});
  console.error(e);
  process.exitCode = 1;
} finally {
  await browser.close();
  app.server.close();
  staticServer?.close();
  await rm(work, { recursive: true, force: true });
}
