// Milestone 1 demonstration (01-visual-editor.md §6), fully reproducible:
// build the page in the editor UI from an empty template, edit its design,
// adapt it to mobile, save, reload, export to Astro, build the export from its
// lockfile outside the repository, then measure fidelity and accessibility.
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium, type Locator } from 'playwright';
import { createApi } from '../../apps/studio/dev-server/api.ts';
import { accessibility, diffStyles, imagesLoaded, shot, snapshot } from '../fidelity/compare.ts';
import { serve } from '../serve.ts';

const repo = join(import.meta.dirname, '../..');
const step = (s: string) => console.log(`→ ${s}`);
const fail = (message: string): never => {
  throw new Error(message);
};

step('Build du Studio');
execFileSync('npm', ['run', 'build', '-w', '@ns/studio'], { cwd: repo, stdio: 'pipe' });
const work = await mkdtemp(join(tmpdir(), 'ns-demo-'));
const api = createApi({ dataDir: join(work, 'data'), mediaDirs: [], exportsDir: join(work, 'exports') });
const app = await serve(join(repo, 'apps/studio/dist'), { middleware: api });
const browser = await chromium.launch();
// A French browser: the Studio opens in French (ADR-0024), the language of these scenarios.
const page = await browser.newPage({ locale: 'fr-FR', viewport: { width: 1600, height: 1000 } });
page.on('dialog', (d) => void d.accept());
const errors: string[] = [];
page.on('pageerror', (e) => errors.push(e.message));

const canvas = page.frameLocator('iframe[title="Aperçu de la page"]');
const library = (name: string) => page.locator('.library').getByRole('button', { name, exact: true });
const row = (label: string, nth = 0) =>
  page
    .locator('.tree-row')
    .filter({ has: page.locator('.tree-label', { hasText: new RegExp(`^${label}$`) }) })
    .nth(nth);
const fill = async (label: string, value: string) => {
  const input = page.getByLabel(label, { exact: true });
  await input.fill(value);
  await input.blur();
};
async function richText(text: string) {
  await page.locator('.rt-editor').click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.type(text);
  await page.locator('.rt-editor').blur();
}
async function eventually<T>(probe: () => Promise<T>, expected: T, message: string) {
  let last: T | undefined;
  for (const end = Date.now() + 3000; Date.now() < end; await new Promise((r) => setTimeout(r, 25))) {
    last = await probe();
    if (last === expected) return;
  }
  fail(`${message} : attendu ${String(expected)}, obtenu ${String(last)}`);
}
const css = (l: Locator, prop: string) =>
  l.evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), prop);

try {
  await page.goto(`${app.url}/`);
  step('Nouveau projet depuis le modèle « Page vide »');
  await page.getByLabel('Modèle').selectOption({ value: 'blank' });
  await page.getByRole('button', { name: 'Créer le projet' }).click();

  step('Section hero : composition Hero, image à la place du visuel');
  await library('Hero').click();
  await row('Visuel').click();
  await page.keyboard.press('Delete');
  await row('Hero').click();
  await library('Image').click();
  await page.locator('aside input[type="file"]').setInputFiles(join(repo, 'fixtures/media/afixture001.png'));
  await page
    .locator('aside fieldset')
    .getByLabel('Texte alternatif')
    .fill('Illustration abstraite du studio');
  await page.getByRole('button', { name: "Ajouter l'image" }).click();
  await canvas.locator('img.ns-image').waitFor();
  await fill('Croissance (flex-grow)', '1');
  await fill('Base (flex-basis) (valeur)', '0');
  await fill('Arrondi (valeur)', '16');

  step('Titre, paragraphe et bouton');
  await row('Titre').click();
  await fill('Texte', 'Des sites rapides, sûrs et autonomes');
  await fill('Taille de police (valeur)', '52');
  await row('Texte').click();
  await richText('Concevez visuellement, publiez un site Astro statique sans dépendance au Studio.');
  await row('Bouton').click();
  await fill('Libellé', 'Démarrer un projet');
  await fill('Adresse', '#contact');

  step('Design du hero : fond, marges internes, arrondi');
  await row('Hero').click();
  await page.getByLabel('Couleur de fond', { exact: true }).fill('#eef2ff');
  for (const side of ['gauche', 'droite']) await fill(`Padding ${side} (valeur)`, '40');
  await fill('Arrondi (valeur)', '24');

  step('Grille de trois cartes : composition, première carte, duplication');
  await page.keyboard.press('Escape');
  await library('Rangée 3 colonnes').click();
  await row('Colonne').click();
  await library('Titre').click();
  await fill('Texte', 'Rapide');
  await row('Colonne').click();
  await library('Texte').click();
  await richText('HTML pré-rendu, aucun JavaScript livré par défaut.');
  await row('Colonne').click();
  await page.getByLabel('Couleur de fond', { exact: true }).fill('#f8fafc');
  for (const side of ['haut', 'droite', 'bas', 'gauche']) await fill(`Padding ${side} (valeur)`, '24');
  await fill('Arrondi (valeur)', '12');
  for (let i = 0; i < 2; i++) {
    await row('Colonne', 1).click();
    await page.keyboard.press('Delete');
  }
  await row('Colonne').click();
  await page.keyboard.press('ControlOrMeta+d');
  await page.keyboard.press('ControlOrMeta+d');
  await eventually(() => canvas.locator('.ns-grid > .ns-stack').count(), 3, 'trois cartes');
  for (const [i, title] of [
    [2, 'Sûr'],
    [3, 'Réversible'],
  ] as const) {
    await row('Titre', i).click();
    await fill('Texte', title);
  }

  step('Adaptation mobile');
  await page.getByRole('radio', { name: 'Mobile' }).click();
  await row('Titre').click();
  await fill('Taille de police (valeur)', '34');
  const heroTitle = canvas.locator('h1');
  await eventually(() => css(heroTitle, 'font-size'), '34px', 'titre mobile');
  await eventually(
    () => css(canvas.locator('.ns-grid'), 'grid-template-columns').then((v) => v.split(' ').length),
    1,
    'une colonne sur mobile',
  );
  await page.getByRole('radio', { name: 'Desktop' }).click();
  await eventually(() => css(heroTitle, 'font-size'), '52px', 'titre desktop inchangé');
  await eventually(
    () => css(canvas.locator('.ns-grid'), 'grid-template-columns').then((v) => v.split(' ').length),
    3,
    'trois colonnes sur desktop',
  );

  step('Enregistrer, fermer, recharger');
  await page.keyboard.press('Escape');
  await page.keyboard.press('ControlOrMeta+s');
  await eventually(() => page.locator('.toolbar .status').textContent(), 'Enregistré', 'enregistrement');
  const frame = () =>
    page.frames().find((f) => f.url().includes('canvas.html')) ?? fail('canvas introuvable');
  const before = (await snapshot(frame())).html;
  const [saved] = (await (await fetch(`${app.url}/api/projects`)).json()) as { id: string }[];
  if (!saved) fail('aucun projet enregistré');
  const savedJson = await (await fetch(`${app.url}/api/projects/${saved?.id}`)).text();
  await page.reload();
  await eventually(
    () => heroTitle.textContent(),
    'Des sites rapides, sûrs et autonomes',
    'document rechargé',
  );
  await imagesLoaded(frame());
  if ((await snapshot(frame())).html !== before) fail('le canvas rechargé diffère du canvas enregistré');

  step('Contrôles, export Astro et build statique depuis le Studio (npm ci + astro build, hors dépôt)');
  await page.getByRole('button', { name: 'Plus d’actions' }).click();
  await page.getByRole('menuitem', { name: 'Exporter le site (Astro)…' }).click();
  const dialog = page.getByRole('dialog', { name: 'Exporter le site' });
  await dialog.getByText('Contrôles avant export').waitFor({ timeout: 5000 });
  await dialog.getByLabel(/Construire aussi le site statique/).check();
  await dialog.getByRole('button', { name: 'Exporter', exact: true }).click();
  const result = dialog.locator('.export-result');
  await result
    .waitFor({ timeout: 10 * 60_000 })
    .catch(async () => fail(`export : ${await dialog.textContent()}`));
  const [exportDir, staticDir] = (await result.locator('code').allTextContents()).map((t) => t.trim()) as [
    string,
    string,
  ];
  if (!staticDir) fail('build statique absent');
  await dialog.getByRole('button', { name: 'Fermer' }).click();

  const html = await readFile(join(staticDir, 'index.html'), 'utf8');
  const scripts = (html.match(/<script/g) ?? []).length;
  // Raster images are optimized at build (astro:assets): WebP variants and a srcset.
  const variants = (await readdir(join(staticDir, '_astro'))).filter((f) => f.endsWith('.webp'));
  if (!variants.length || !/srcset="[^"]*\.webp \d+w/i.test(html)) fail('variantes WebP absentes');
  const media = `${variants.length} variante(s) WebP, srcset`;

  step('Fidélité et accessibilité : canvas vs site construit');
  const fourOhFour = (await readdir(staticDir))
    .filter((f) => ['404.html', 'robots.txt'].includes(f))
    .join(', ');
  if (fourOhFour !== '404.html, robots.txt') fail(`fichiers du site statique : ${fourOhFour}`);
  const site = await serve(staticDir);
  // Canvas with the export's media URLs (/media/<file>), as in the fidelity bench.
  const canvasApp = await serve(join(repo, 'apps/studio/dist'), {
    mounts: { '/media/': join(work, 'data/projects', saved?.id ?? '', 'media') },
  });
  const rows: string[] = [];
  let failures = 0;
  for (const width of [1280, 1023, 767, 420]) {
    const p = await browser.newPage({ viewport: { width, height: 2400 } });
    await p.goto(`${site.url}/`);
    await imagesLoaded(p);
    const a = await snapshot(p);
    const shotA = await shot(p);
    await mkdir(join(repo, 'test-results'), { recursive: true });
    if (width === 1280 || width === 420) await writeFile(join(repo, `test-results/demo-${width}.png`), shotA);
    const a11y = await accessibility(p);
    await p.goto(`${canvasApp.url}/canvas.html`);
    await p.evaluate(
      (d: unknown) =>
        new Promise((ok) => {
          addEventListener('message', (e) => e.data?.type === 'rendered' && ok(null));
          postMessage(
            {
              type: 'render',
              doc: d,
              pageId: (d as { settings: { homePageId: string } }).settings.homePageId,
            },
            '*',
          );
        }),
      JSON.parse(savedJson) as unknown,
    );
    await imagesLoaded(p);
    const b = await snapshot(p);
    const shotB = await shot(p);
    await p.close();
    const styles = diffStyles(a, b);
    const ok = a.html === b.html && !styles.length && shotA.equals(shotB) && !a11y.length;
    if (!ok) failures++;
    rows.push(
      `| ${width} | ${a.html === b.html ? 'identique' : '**différent**'} | ${styles.length}/${a.elements.length} | ${shotA.equals(shotB) ? 'identiques' : '**différents**'} | ${a11y.length ? JSON.stringify(a11y) : 'aucune'} |`,
    );
  }
  site.server.close();
  canvasApp.server.close();

  const report = [
    `# Démonstration du jalon 1 — ${new Date().toISOString()}`,
    '',
    'Page construite dans l’éditeur depuis « Page vide » : hero (titre, paragraphe, bouton, image),',
    'grille de trois cartes, adaptation mobile ; enregistrée, rechargée, exportée et construite hors dépôt.',
    '',
    `- Rechargement : canvas identique à l’état enregistré.`,
    `- Export : sources \`${exportDir}\`, site statique \`${staticDir}\` (\`npm ci\` + build lancés par le Studio) ; \`<script>\` dans index.html : ${scripts} ; images optimisées : ${media} ; 404, robots.txt : ${fourOhFour}.`,
    '',
    '| Largeur | DOM normalisé | Éléments à style/boîte différent | Pixels | Violations a11y graves (axe) |',
    '|---|---|---|---|---|',
    ...rows,
    '',
    `Erreurs JavaScript dans l’éditeur : ${errors.length ? errors.join(' | ') : 'aucune'}.`,
    '',
  ].join('\n');
  await mkdir(join(repo, 'test-results'), { recursive: true });
  await writeFile(join(repo, 'test-results/demo-report.md'), report);
  await writeFile(join(repo, 'test-results/demo.json'), savedJson);
  console.log(`\n${report}`);
  if (failures || scripts || errors.length) fail('La démonstration a relevé des écarts (voir le rapport).');
  console.log('Démonstration réussie.');
} finally {
  await browser.close();
  app.server.close();
  await rm(work, { recursive: true, force: true });
}
