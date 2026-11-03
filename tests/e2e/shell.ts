// End-to-end checks of the editor shell (tranche 2) on the production build.
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium, type Locator, type Page } from 'playwright';
import { aiConfigFromEnv } from '../../apps/studio/dev-server/ai/service.ts';
import { createApi } from '../../apps/studio/dev-server/api.ts';
import { accessibility } from '../fidelity/compare.ts';
import { serve } from '../serve.ts';

const repo = join(import.meta.dirname, '../..');
execFileSync('npm', ['run', 'build', '-w', '@ns/studio'], { cwd: repo, stdio: 'pipe' });
const work = await mkdtemp(join(tmpdir(), 'ns-e2e-'));
const api = createApi({
  dataDir: join(work, 'data'),
  mediaDirs: [join(repo, 'fixtures/media')],
  templatesDir: join(repo, 'templates'),
  exportsDir: join(work, 'exports'),
  ai: aiConfigFromEnv({ NS_AI_PROVIDER: 'simulated' }),
});
const app = await serve(join(repo, 'apps/studio/dist'), { middleware: api });
const browser = await chromium.launch();
// A French browser: the Studio opens in French (ADR-0024), the language of these scenarios and of the guide.
const page: Page = await browser.newPage({ locale: 'fr-FR', viewport: { width: 1700, height: 1000 } });
const errors: string[] = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('dialog', (d) => void d.accept());

let failures = 0;
async function check(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`✓ ${name}`);
  } catch (e) {
    failures++;
    const lines = (e as Error).message.split('\n');
    // First line, plus the locator Playwright was waiting for, and a screenshot of the editor.
    const waiting = lines.find((l) => l.includes('waiting for'))?.trim();
    const shotPath = join(repo, `test-results/e2e-failure-${failures}.png`);
    await mkdir(join(repo, 'test-results'), { recursive: true });
    await page.screenshot({ path: shotPath }).catch(() => {});
    console.log(`✗ ${name}\n  ${lines[0]}${waiting ? `\n  ${waiting}` : ''}\n  capture : ${shotPath}`);
  }
}
const expect = (cond: boolean, message: string) => {
  if (!cond) throw new Error(message);
};
/** The canvas updates asynchronously (postMessage): poll until `probe` returns `expected`. */
async function eventually<T>(probe: () => Promise<T>, expected: T, message: string) {
  let last: T | undefined;
  for (const end = Date.now() + 2000; Date.now() < end; await new Promise((r) => setTimeout(r, 25))) {
    last = await probe();
    if (last === expected) return;
  }
  throw new Error(`${message} : attendu ${String(expected)}, obtenu ${String(last)}`);
}

await page.goto(`${app.url}/`);
await page.getByLabel('Modèle').selectOption({ label: 'Composition Flex' });
await page.getByRole('button', { name: 'Créer le projet' }).click();
const canvas = page.frameLocator('iframe[title="Aperçu de la page"]');
const heading = canvas.locator('.ns-nh1000001');
const fontSize = () => heading.evaluate((el) => getComputedStyle(el).fontSize);
const undo = page.getByRole('button', { name: 'Annuler' });
const slider = page.getByRole('slider', { name: 'Taille de police' });
const box = async (l: Locator) => {
  await l.scrollIntoViewIfNeeded();
  const b = await l.boundingBox();
  if (!b) throw new Error('no box');
  return b;
};

await check('R3 : le canvas se charge dans une iframe sandbox et rend le document', async () => {
  await heading.waitFor({ timeout: 5000 });
  const sandbox = await page.locator('iframe').getAttribute('sandbox');
  expect(sandbox === 'allow-scripts allow-same-origin', `sandbox=${sandbox}`);
  expect((await heading.textContent()) === 'Un hero en Flex', 'texte du titre');
});

await check('Clic dans le canvas → sélection synchronisée (arborescence, inspecteur, overlay)', async () => {
  await heading.click();
  await page.getByRole('treeitem', { name: /^Titre/, selected: true }).waitFor({ timeout: 2000 });
  expect((await page.locator('aside h2').textContent()) === 'Titre', 'inspecteur');
  const overlay = await box(page.locator('.overlay-selected'));
  const target = await box(heading);
  const delta = Math.max(
    ...(['x', 'y', 'width', 'height'] as const).map((k) => Math.abs(overlay[k] - target[k])),
  );
  expect(delta < 1, `overlay décalé de ${delta}px`);
});

await check("Clic dans l'arborescence → sélection et libellé de l'overlay", async () => {
  await page.locator('.tree-row', { hasText: 'Hero' }).click();
  expect((await page.locator('.overlay-label').textContent()) === 'Hero', 'libellé overlay');
  await page.locator('.tree-row', { hasText: 'Titre' }).click();
});

await check('Glisser le slider = une seule étape d’annulation', async () => {
  expect((await fontSize()) === '48px', `taille initiale ${await fontSize()}`);
  const s = await box(slider);
  await page.mouse.move(s.x + s.width * 0.4, s.y + s.height / 2);
  await page.mouse.down();
  for (let i = 1; i <= 20; i++) await page.mouse.move(s.x + s.width * (0.4 + i * 0.02), s.y + s.height / 2);
  await page.mouse.up();
  await eventually(async () => (await fontSize()) !== '48px', true, 'la taille aurait dû changer');
  await undo.click();
  await eventually(fontSize, '48px', 'après 1 annulation');
  expect(await undo.isDisabled(), 'une seule entrée attendue dans l’historique');
});

await check('Viewport mobile → breakpoint mobile édité, desktop inchangé', async () => {
  await page.getByRole('radio', { name: 'Mobile' }).click();
  expect((await box(page.locator('iframe'))).width === 390, 'largeur iframe');
  expect((await page.locator('.breakpoint strong').textContent()) === 'Mobile', 'libellé breakpoint');
  await eventually(fontSize, '32px', 'taille mobile');
  await slider.focus();
  await page.keyboard.press('ArrowRight');
  await eventually(fontSize, '33px', 'après flèche');
  await page.getByRole('radio', { name: 'Desktop' }).click();
  await eventually(fontSize, '48px', 'desktop modifié');
  await undo.click();
});

await check('Saisie invalide refusée sans corrompre le document', async () => {
  const input = page.getByLabel('Texte', { exact: true });
  await input.fill('Nouveau titre');
  await eventually(() => heading.textContent(), 'Nouveau titre', 'texte mis à jour');
  await input.fill('');
  expect((await input.getAttribute('aria-invalid')) === 'true', 'champ signalé invalide');
  expect((await heading.textContent()) === 'Nouveau titre', 'dernier texte valide conservé');
  await input.blur();
  // A rich text field (ADR-0020): its content is the editable text.
  expect((await input.textContent()) === 'Nouveau titre', 'champ resynchronisé');
  await undo.click();
  await eventually(() => heading.textContent(), 'Un hero en Flex', 'saisie annulée en une étape');
});

await check('Raccourcis relayés depuis le canvas : Suppr puis ⌘Z', async () => {
  await heading.click();
  await page.keyboard.press('Delete');
  await eventually(() => canvas.locator('.ns-nh1000001').count(), 0, 'titre supprimé');
  await page.keyboard.press('ControlOrMeta+z');
  await heading.waitFor({ timeout: 2000 });
});

const rootOrder = () =>
  canvas.locator('.ns-nroot00001 > *').evaluateAll((els) => els.map((e) => e.className).join(' | '));
const drag = async (source: Locator, x: number, y: number) => {
  const s = await box(source);
  await page.mouse.move(s.x + s.width / 2, s.y + s.height / 2);
  await page.mouse.down();
  await page.mouse.move(s.x + s.width / 2 + 20, s.y + s.height / 2 + 20, { steps: 4 });
  await page.mouse.move(x, y, { steps: 12 });
  await page.locator('.drop-marker').waitFor({ timeout: 2000 });
  await page.mouse.up();
};

await check('Bibliothèque : clic = insertion après la sélection, une seule annulation', async () => {
  await heading.click();
  await page.locator('.library').getByRole('button', { name: 'Bouton', exact: true }).click();
  const order = () =>
    canvas.locator('.ns-ncopy0001 > *').evaluateAll((els) => els.map((e) => e.tagName).join(','));
  await eventually(order, 'H1,A,P', 'ordre dans la pile');
  await undo.click();
  await eventually(order, 'H1,P', 'après annulation');
});

await check('Glisser une composition sous le contenu = ajout en fin de page', async () => {
  const frame = await box(page.locator('iframe'));
  await drag(
    page.locator('.library').getByRole('button', { name: 'Rangée 2 colonnes' }),
    frame.x + frame.width / 2,
    frame.y + frame.height - 20,
  );
  await eventually(
    () => canvas.locator('.ns-nroot00001 > .ns-grid > .ns-stack').count(),
    2,
    'grille à 2 colonnes ajoutée',
  );
  await undo.click();
  await eventually(() => canvas.locator('.ns-grid').count(), 0, 'après annulation');
});

await check("Glisser un élément de l'arborescence = déplacement, identifiants conservés", async () => {
  const before = await rootOrder();
  const hero = await box(canvas.locator('.ns-nhero0001'));
  await drag(page.locator('.tree-row', { hasText: 'Rangée' }), hero.x + 100, hero.y - 10);
  await eventually(rootOrder, 'ns-stack ns-nrow00001 | ns-stack ns-nhero0001', 'rangée au-dessus du hero');
  await undo.click();
  await eventually(rootOrder, before, 'après annulation');
});

await check('Inspecteur : couleur de fond, une étape d’annulation', async () => {
  await page.locator('.tree-row', { hasText: 'Hero' }).click();
  const bg = () => canvas.locator('.ns-nhero0001').evaluate((el) => getComputedStyle(el).backgroundColor);
  await page.getByLabel('Couleur de fond', { exact: true }).fill('#ff0000');
  await eventually(bg, 'rgb(255, 0, 0)', 'fond appliqué');
  await undo.click();
  await eventually(bg, 'rgba(0, 0, 0, 0)', 'après annulation');
});

await check('Inspecteur : masquer sur mobile uniquement', async () => {
  await page.locator('.tree-row', { hasText: 'Rangée' }).click();
  await page.getByRole('radio', { name: 'Mobile' }).click();
  const display = () => canvas.locator('.ns-nrow00001').evaluate((el) => getComputedStyle(el).display);
  await page.getByLabel('Masquer sur ce breakpoint').check();
  await eventually(display, 'none', 'masqué sur mobile');
  await page.getByRole('radio', { name: 'Desktop' }).click();
  await eventually(display, 'flex', 'visible sur desktop');
  await undo.click();
});

await check('Texte enrichi : mise en gras depuis l’inspecteur', async () => {
  await canvas.locator('.ns-ntxt00001').click();
  await page.locator('aside h2', { hasText: 'Texte' }).waitFor();
  const editor = page.locator('.rt-editor');
  await editor.click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.getByRole('button', { name: 'Gras' }).click();
  await eventually(() => canvas.locator('.ns-ntxt00001 strong').count(), 1, 'texte en gras dans le canvas');
  await undo.click();
  await eventually(() => canvas.locator('.ns-ntxt00001 strong').count(), 0, 'après annulation');
});

const status = () => page.locator('.toolbar .status').textContent();
const saveButton = page.getByRole('button', { name: 'Enregistrer' });

await check('Enregistrer puis recharger : le document est retrouvé à l’identique', async () => {
  await page.locator('.tree-row', { hasText: 'Titre' }).click();
  await page.getByLabel('Texte', { exact: true }).fill('Titre enregistré');
  await page.getByLabel('Texte', { exact: true }).blur();
  await saveButton.click();
  await eventually(status, 'Enregistré', 'statut');
  const projects = await readdir(join(work, 'data/projects'));
  expect(projects.length === 1 && /^p[a-z0-9]{10}$/.test(projects[0] ?? ''), `projets : ${projects}`);
  await page.reload();
  await eventually(() => heading.textContent(), 'Titre enregistré', 'contenu rechargé');
  await eventually(status, 'Enregistré', 'non modifié après chargement');
});

await check('Échec d’enregistrement visible, document conservé, nouvel essai', async () => {
  await page.locator('.tree-row', { hasText: 'Titre' }).click();
  await page.route('**/api/projects/**', (r) => r.abort());
  await page.getByLabel('Texte', { exact: true }).fill('Titre hors ligne');
  await page.getByLabel('Texte', { exact: true }).blur();
  await saveButton.click();
  await page.getByRole('alert').filter({ hasText: 'Échec' }).waitFor({ timeout: 2000 });
  await eventually(status, 'Modifié (non enregistré)', 'toujours modifié');
  await eventually(() => heading.textContent(), 'Titre hors ligne', 'modification conservée');
  await page.unroute('**/api/projects/**');
  await page.getByRole('button', { name: 'Réessayer' }).click();
  await eventually(status, 'Enregistré', 'après nouvel essai');
});

await check('Conflit : jamais d’écrasement silencieux d’une version plus récente', async () => {
  const [id] = await readdir(join(work, 'data/projects'));
  const res = await fetch(`${app.url}/api/projects/${id}`);
  const remote = (await res.json()) as { name: string };
  const put = await fetch(`${app.url}/api/projects/${id}`, {
    method: 'PUT',
    headers: {
      'x-ns-request': '1',
      'content-type': 'application/json',
      'if-match': res.headers.get('etag') ?? '',
    },
    body: JSON.stringify({ ...remote, name: 'Modifié ailleurs' }),
  });
  expect(put.ok, `PUT externe ${put.status}`);
  await page.getByLabel('Texte', { exact: true }).fill('Titre local');
  await page.getByLabel('Texte', { exact: true }).blur();
  await saveButton.click();
  await page.getByRole('button', { name: 'Écraser la version du serveur' }).click();
  await eventually(status, 'Enregistré', 'après écrasement explicite');
});

await check('Image : texte alternatif obligatoire, envoi, export avec le média', async () => {
  await page.keyboard.press('Escape');
  await page.locator('.library').getByRole('button', { name: 'Image', exact: true }).click();
  await page.locator('aside input[type="file"]').setInputFiles(join(repo, 'fixtures/media/afixture001.png'));
  await page.getByRole('button', { name: "Ajouter l'image" }).click();
  await page.getByText('Texte alternatif obligatoire').waitFor({ timeout: 2000 });
  await page.locator('aside fieldset').getByLabel('Texte alternatif').fill('Un dégradé');
  await page.getByRole('button', { name: "Ajouter l'image" }).click();
  const img = canvas.locator('img.ns-image');
  await eventually(() => img.getAttribute('alt'), 'Un dégradé', 'image dans le canvas');
  const src = (await img.getAttribute('src')) ?? '';
  expect(/^\/media\/p[a-z0-9]{10}\/a[a-z0-9]+\.png$/.test(src), `src propre au projet : ${src}`);
  await eventually(
    () => img.evaluate((el) => (el as HTMLImageElement).naturalWidth > 0),
    true,
    'image chargée',
  );
  await page.getByRole('button', { name: 'Plus d’actions' }).click();
  await page.getByRole('menuitem', { name: 'Exporter le site (Astro)…' }).click();
  const dialog = page.getByRole('dialog', { name: 'Exporter le site' });
  await dialog.getByText('Contrôles avant export').waitFor({ timeout: 5000 });
  await dialog.getByRole('button', { name: 'Exporter', exact: true }).click();
  await dialog
    .getByText('Sources Astro')
    .waitFor({ timeout: 10000 })
    .catch(async () => {
      throw new Error(`export : ${await dialog.textContent()}`);
    });
  await dialog.getByRole('button', { name: 'Fermer' }).click();
  const [exported] = await readdir(join(work, 'exports'));
  const media = await readdir(join(work, 'exports', exported ?? '', 'src/media'));
  expect(media.length === 1, `médias exportés : ${media}`);
  await undo.click();
  await eventually(() => canvas.locator('img.ns-image').count(), 0, 'une annulation retire l’image');
});

await check('Arborescence au clavier (motif ARIA tree)', async () => {
  await page.locator('.tree-row', { hasText: 'Hero' }).click();
  const selected = () => page.getByRole('treeitem', { selected: true }).locator('.tree-label').textContent();
  await page.keyboard.press('ArrowDown');
  await eventually(selected, 'Pile (Flex)', 'flèche bas');
  await page.keyboard.press('ArrowLeft'); // expanded → collapse
  await page.keyboard.press('ArrowLeft'); // collapsed → parent
  await eventually(selected, 'Hero', 'flèche gauche vers le parent');
  await page.keyboard.press('ArrowRight');
  await eventually(selected, 'Pile (Flex)', 'flèche droite vers le premier enfant');
  await page.keyboard.press('ArrowRight'); // re-expand
  await page.keyboard.press('End');
  const last = await page.getByRole('treeitem').last().getAttribute('data-id');
  await eventually(
    () => page.getByRole('treeitem', { selected: true }).getAttribute('data-id'),
    last,
    'Fin = dernier visible',
  );
  await page.keyboard.press('Home');
  await eventually(selected, 'Page', 'Début = racine');
});

await check('Couper / coller vers un autre conteneur, au clavier', async () => {
  await page.locator('.tree-row', { hasText: 'Titre' }).click();
  await page.keyboard.press('ControlOrMeta+x');
  await eventually(() => canvas.locator('.ns-ncopy0001 h1').count(), 0, 'coupé');
  await page.locator('.tree-row', { hasText: 'Rangée' }).click();
  await page.keyboard.press('ControlOrMeta+v');
  await eventually(() => canvas.locator('.ns-nrow00001 > h1').count(), 1, 'collé dans la rangée');
  await page.keyboard.press('ControlOrMeta+v');
  await eventually(
    () => canvas.locator('.ns-nrow00001 > h1').count(),
    2,
    'collé une seconde fois (nouveaux identifiants)',
  );
  await undo.click();
  await undo.click();
  await undo.click();
  await eventually(() => canvas.locator('.ns-ncopy0001 h1').count(), 1, 'trois annulations');
});

await check('Panneaux redimensionnables au clavier', async () => {
  const sep = page.getByRole('separator', { name: "Largeur de l'inspecteur" });
  const before = (await box(page.locator('aside.panel'))).width;
  await sep.focus();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  const after = (await box(page.locator('aside.panel'))).width;
  expect(Math.round(after - before) === 32, `largeur ${before} → ${after}`);
});

await check('Aperçu sans les contrôles de l’éditeur (VE-01)', async () => {
  await heading.click();
  const preview = page.getByRole('button', { name: 'Aperçu', exact: true });
  await preview.click();
  expect(
    !(await page.locator('.left').isVisible()) && (await page.locator('aside.panel').count()) === 0,
    'panneaux masqués',
  );
  expect(!(await page.locator('.overlays').isVisible()), 'overlays masqués');
  await canvas.locator('.ns-ntxt00001').click();
  await preview.click();
  await page.locator('aside h2', { hasText: 'Titre' }).waitFor({ timeout: 2000 });
});

await check("Accessibilité de l'éditeur (axe, WCAG 2.1 AA, violations graves)", async () => {
  await heading.click();
  const violations = await accessibility(page);
  expect(violations.length === 0, JSON.stringify(violations));
});

await check('Contrôle segmenté au clavier (flèches, Espace) et infobulles', async () => {
  await page.getByRole('radio', { name: 'Desktop' }).press('ArrowRight');
  // Radix moves roving focus asynchronously.
  await eventually(
    () => page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? ''),
    'Tablette',
    'focus après flèche',
  );
  await page.keyboard.press('Space');
  await eventually(
    async () => (await box(page.locator('iframe'))).width,
    820,
    'tablette sélectionnée au clavier',
  );
  await page.getByRole('radio', { name: 'Desktop' }).click();
  await page.getByRole('button', { name: 'Annuler' }).hover();
  await eventually(
    () => page.locator('.ui-tooltip').first().textContent(),
    'Annuler⌘Z',
    'infobulle avec raccourci',
  );
});

await check('Thème clair : bascule et accessibilité (axe)', async () => {
  await page.getByRole('button', { name: 'Thème clair' }).click();
  await eventually(
    () => page.evaluate(() => document.documentElement.dataset.theme ?? ''),
    'light',
    'thème appliqué',
  );
  const violations = await accessibility(page);
  expect(violations.length === 0, JSON.stringify(violations));
  await page.getByRole('button', { name: 'Thème sombre' }).click();
});

await check('Langue de l’interface : anglais, puis retour au français (ADR-0024)', async () => {
  if (await saveButton.isEnabled()) await saveButton.click();
  await eventually(status, 'Enregistré', 'enregistré avant le rechargement');
  await page.getByRole('button', { name: 'Langue de l’interface' }).click();
  await page.getByRole('menuitem', { name: 'English' }).click();
  await eventually(status, 'Saved', 'interface en anglais');
  expect((await page.evaluate(() => document.documentElement.lang)) === 'en', 'lang de la page');
  await page.getByRole('button', { name: 'Interface language' }).click();
  await page.getByRole('menuitem', { name: 'Français' }).click();
  await eventually(status, 'Enregistré', 'retour au français');
});

await check(
  'Langue par défaut : celle du navigateur si elle est traduite, sinon l’anglais (ADR-0024)',
  async () => {
    for (const [locale, expected] of [
      ['en-US', 'Projects'],
      ['de-DE', 'Projects'],
      ['fr-CA', 'Projets'],
    ] as const) {
      const fresh = await browser.newPage({ locale });
      await fresh.goto(`${app.url}/`);
      await fresh.getByRole('heading', { name: expected, exact: true }).waitFor({ timeout: 5000 });
      expect(
        (await fresh.evaluate(() => document.documentElement.lang)) ===
          (expected === 'Projets' ? 'fr' : 'en'),
        `lang de la page (${locale})`,
      );
      await fresh.close();
    }
  },
);

await check('Site de 3 pages liées : créer, lier, renommer un slug, recharger (SB-02)', async () => {
  const pages = page.locator('.pages');
  const add = async (title: string, slug: string) => {
    await pages.getByRole('button', { name: 'Ajouter une page' }).click();
    await page.keyboard.press('Escape');
    await page.getByLabel('Titre', { exact: true }).fill(title);
    await page.getByLabel('Titre', { exact: true }).blur();
    await page.getByLabel('Adresse (slug)').fill(slug);
    await page.getByLabel('Adresse (slug)').blur();
  };
  await add('À propos', 'a-propos');
  await add('Contact', 'contact');
  const home = pages.locator('.pages-item').first();
  await home.click();
  await page.locator('.library').getByRole('button', { name: 'Bouton', exact: true }).click();
  await page.getByLabel('Lien', { exact: true }).selectOption({ label: 'Contact' });
  const button = canvas.locator('.ns-button').first();
  await eventually(() => button.getAttribute('href'), '/contact/', 'lien vers la page');
  // The slug change is signalled, and the link follows it.
  await pages.getByRole('button', { name: /Contact/ }).click();
  await page.getByText('1 élément du site lie vers cette page').waitFor({ timeout: 2000 });
  await page.getByLabel('Adresse (slug)').fill('nous-ecrire');
  await page.getByLabel('Adresse (slug)').blur();
  await home.click();
  await eventually(() => button.getAttribute('href'), '/nous-ecrire/', 'le lien suit le slug');
  await saveButton.click();
  await eventually(status, 'Enregistré', 'statut');
  await page.reload();
  await eventually(
    () =>
      pages
        .locator('.pages-path')
        .allTextContents()
        .then((t) => t.join(' ')),
    '/ /a-propos/ /nous-ecrire/',
    'pages rechargées',
  );
  await eventually(
    () => canvas.locator('.ns-button').first().getAttribute('href'),
    '/nous-ecrire/',
    'lien rechargé',
  );
  expect(/#\/p\/p[a-z0-9]{10}\/[a-z0-9]+$/.test(page.url()), `URL : ${page.url()}`);
});

await check('Design tokens : une couleur modifiée se répercute sur 3 pages (SB-05)', async () => {
  const dsButton = page.getByRole('button', { name: 'Design system' });
  const ds = page.getByRole('complementary', { name: 'Design system' });
  await dsButton.click();
  await ds.getByRole('button', { name: 'Ajouter une couleur' }).click();
  await ds.getByLabel('Couleur — valeur').fill('#2563eb');
  await dsButton.click();
  const items = page.locator('.pages .pages-item');
  const lastHeading = canvas.locator('h1, h2, h3, h4, h5, h6').last();
  for (let i = 0; i < 3; i++) {
    await items.nth(i).click();
    await page.locator('.library').getByRole('button', { name: 'Titre', exact: true }).click();
    await page.getByLabel('Couleur du texte (token)').selectOption({ label: 'Couleur' });
    await eventually(
      () => lastHeading.evaluate((el) => getComputedStyle(el).color),
      'rgb(37, 99, 235)',
      `page ${i + 1}`,
    );
  }
  await dsButton.click();
  await ds.getByLabel('Couleur — valeur').fill('#dc2626');
  for (let i = 0; i < 3; i++) {
    await items.nth(i).click();
    await eventually(
      () => lastHeading.evaluate((el) => getComputedStyle(el).color),
      'rgb(220, 38, 38)',
      `page ${i + 1} après modification`,
    );
  }
  const refused = ds.getByRole('button', { name: 'Supprimer Couleur' });
  await refused.click();
  await page.getByRole('alert').filter({ hasText: 'Token utilisé par 3' }).waitFor({ timeout: 2000 });
  await dsButton.click();
});

await check(
  'CSS du projet : classes, coloration, erreurs, avertissements et annulation (ADR-0023)',
  async () => {
    const dsButton = page.getByRole('button', { name: 'Design system' });
    const ds = page.getByRole('complementary', { name: 'Design system' });
    const target = canvas.locator('h1, h2, h3, h4, h5, h6').last();
    const spacing = () => target.evaluate((el) => getComputedStyle(el).letterSpacing);
    await target.click();
    const classes = page.getByLabel('Classes CSS (séparées par des espaces)');
    await classes.fill('NS-interdit');
    await page.getByText("Valeur refusée, le document n'est pas modifié.").waitFor({ timeout: 2000 });
    await classes.fill('titre-test');
    await classes.blur();
    await eventually(
      () => target.evaluate((el) => el.classList.contains('titre-test')),
      true,
      'classe posée',
    );

    await dsButton.click();
    const editor = ds.getByLabel('Feuille de style');
    await editor.fill('.titre-test { letter-spacing: 7px; }');
    await editor.blur();
    await eventually(spacing, '7px', 'règle appliquée dans le canvas');
    // Syntax colors: a copy under the textarea, hidden from assistive technologies.
    const colors = ds.locator('.css-editor pre[aria-hidden="true"]');
    expect((await colors.locator('.css-tok-selector').textContent()) === 'titre-test', 'sélecteur coloré');
    expect(
      (await colors.locator('.css-tok-property').textContent()) === 'letter-spacing',
      'propriété colorée',
    );
    expect(
      (await colors.textContent()) === '.titre-test { letter-spacing: 7px; }\n',
      'copie fidèle du texte',
    );
    // Same box and line breaks as the textarea, with long and wrapped lines.
    await editor.fill(`/* ${'mot '.repeat(40)}*/\n.titre-test {\n  letter-spacing: 7px;\n}\n\n`);
    const boxes = await ds.locator('.css-editor').evaluate((el) => {
      const pre = el.querySelector('pre') as HTMLElement;
      const area = el.querySelector('textarea') as HTMLTextAreaElement;
      return [pre.offsetWidth === area.offsetWidth, pre.scrollHeight === area.scrollHeight];
    });
    await page.locator('.css-editor').screenshot({ path: join(repo, 'test-results/css-editor.png') });
    expect(boxes.every(Boolean), `copie colorée désalignée : ${boxes}`);
    await editor.fill('.titre-test { letter-spacing: 7px; }');

    await editor.fill('@import "x.css";\n.titre-test { letter-spacing: 3px; }');
    await ds.getByText(/Erreur, ligne 1 : @import interdit/).waitFor({ timeout: 2000 });
    expect((await editor.getAttribute('aria-invalid')) === 'true', 'aria-invalid');
    await eventually(spacing, '7px', 'la dernière version valide reste appliquée');

    await editor.fill('.titre-test { letter-spacing: 3px !important; }');
    await ds.getByText(/Attention, ligne 1 : !important/).waitFor({ timeout: 2000 });
    await eventually(spacing, '3px', 'avertissement non bloquant');
    await editor.blur();
    await undo.click();
    await eventually(spacing, '7px', 'annulation');
    await eventually(
      () => editor.inputValue(),
      '.titre-test { letter-spacing: 7px; }',
      'éditeur resynchronisé',
    );
    await dsButton.click();
  },
);

await check('Header et footer partagés sur 3 pages, masquables par page (SB-04)', async () => {
  const pages = page.locator('.pages');
  await pages.getByRole('button', { name: 'Créer le header' }).click();
  await pages.getByRole('button', { name: 'Créer le footer' }).click();
  await pages.locator('.pages-item', { hasText: 'Header' }).click();
  await page.locator('.tree-row', { hasText: 'Logo' }).click();
  await page.getByLabel('Libellé', { exact: true }).fill('Atelier Nord');
  await page.getByLabel('Libellé', { exact: true }).blur();
  const items = pages.locator('.pages-list').first().locator('.pages-item');
  for (let i = 0; i < 3; i++) {
    await items.nth(i).click();
    await eventually(
      () => canvas.locator('header .ns-button').first().textContent(),
      'Atelier Nord',
      `header page ${i + 1}`,
    );
    await eventually(() => canvas.locator('footer nav').count(), 1, `footer page ${i + 1}`);
  }
  // A click on the shared header in a page opens the header for editing.
  await canvas.locator('header .ns-button').first().click();
  await page.getByRole('treeitem', { name: /^Logo/, selected: true }).waitFor({ timeout: 2000 });
  expect(page.url().endsWith('/header'), `URL ${page.url()}`);
  await items.nth(2).click();
  await page.getByLabel('Afficher le header').uncheck();
  await eventually(() => canvas.locator('header').count(), 0, 'header masqué sur la page');
  await page.getByLabel('Afficher le header').check();
  await saveButton.click();
  await eventually(status, 'Enregistré', 'statut');
});

await check(
  'Aperçu du site : navigation par le menu, repli mobile sans JS, modifications non enregistrées (SB-09)',
  async () => {
    const pending = page.context().waitForEvent('page');
    await page.getByRole('button', { name: 'Aperçu du site' }).click();
    const preview = await pending;
    await preview.setViewportSize({ width: 420, height: 900 });
    await preview.locator('header nav').waitFor({ timeout: 5000 });
    const bar = preview.locator('header .ns-nav-bar');
    const menu = preview.locator('header details.ns-nav-menu');
    expect(!(await bar.isVisible()) && (await menu.isVisible()), 'menu replié en mobile');
    expect(
      (await preview.locator('script[src*="nav"], header script').count()) === 0,
      'aucun script de navigation',
    );
    await menu.locator('summary').click();
    await menu.getByRole('link', { name: 'À propos' }).click();
    await eventually(() => preview.title(), 'À propos', 'navigation vers la page');
    expect(/#\/p[a-z0-9]{10}\/a-propos\/$/.test(preview.url()), `URL ${preview.url()}`);
    await preview.setViewportSize({ width: 1280, height: 900 });
    expect(await bar.isVisible(), 'barre de navigation en desktop');
    expect((await bar.locator('[aria-current="page"]').textContent()) === 'À propos', 'page courante');
    // Unsaved edits reach the open preview.
    await page
      .locator('.tree-row', { hasText: 'Logo' })
      .first()
      .click()
      .catch(() => {});
    await page.locator('.pages .pages-item', { hasText: 'Header' }).click();
    await page.locator('.tree-row', { hasText: 'Logo' }).click();
    await page.getByLabel('Libellé', { exact: true }).fill('Atelier Sud');
    await page.getByLabel('Libellé', { exact: true }).blur();
    await eventually(
      () => preview.locator('header .ns-button').first().textContent(),
      'Atelier Sud',
      'aperçu en direct',
    );
    await preview.close();
    await undo.click();
  },
);

await check(
  'Médiathèque : SVG sûr et PDF importés, SVG piégé refusé, recherche, lien de téléchargement (SB-06)',
  async () => {
    const files = {
      logo: join(work, 'logo.svg'),
      trap: join(work, 'piege.svg'),
      pdf: join(work, 'tarifs.pdf'),
    };
    await writeFile(
      files.logo,
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 20"><rect width="40" height="20" fill="#1d4ed8"/></svg>',
    );
    await writeFile(
      files.trap,
      '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><rect width="1" height="1"/></svg>',
    );
    await writeFile(files.pdf, '%PDF-1.7\n1 0 obj\n');
    await page.getByRole('button', { name: 'Médiathèque', exact: true }).click();
    const library = page.getByRole('complementary', { name: 'Médiathèque' });
    await library.locator('input[type="file"]').setInputFiles([files.logo, files.trap, files.pdf]);
    await library
      .getByRole('alert')
      .filter({ hasText: 'piege.svg : SVG refusé : attribut d’événement' })
      .waitFor({ timeout: 5000 });
    const cards = library.locator('.media-card');
    await eventually(() => cards.count(), 2, 'SVG + PDF (le SVG piégé n’est pas ajouté)');
    const pdfCard = cards.filter({ hasText: 'Fichier' });
    await pdfCard.getByLabel('Tags (séparés par des virgules)').fill('offre,tarifs');
    await pdfCard.getByLabel('Tags (séparés par des virgules)').blur();
    await library.getByLabel('Rechercher un média (nom, fichier, tag)').fill('tarifs');
    await eventually(() => cards.count(), 1, 'recherche par tag');
    await library.getByLabel('Rechercher un média (nom, fichier, tag)').fill('');
    await page.getByRole('button', { name: 'Médiathèque', exact: true }).click();
    // A button linking to the PDF (downloadable file of the library).
    await page.locator('.pages .pages-item').first().click();
    await page.locator('.library').getByRole('button', { name: 'Bouton', exact: true }).click();
    await page.getByLabel('Lien', { exact: true }).selectOption({ label: 'tarifs.pdf' });
    const href = () => canvas.locator('.ns-button').last().getAttribute('href');
    await eventually(
      async () => /^\/media\/p[a-z0-9]{10}\/a[a-z0-9]+\.pdf$/.test((await href()) ?? ''),
      true,
      'lien vers le PDF',
    );
    const res = await fetch(`${app.url}${await href()}`);
    expect(res.headers.get('content-disposition') === 'attachment', 'servi en pièce jointe');
    await page.getByRole('button', { name: 'Médiathèque', exact: true }).click();
    await eventually(
      () =>
        pdfCard
          .locator('.media-meta')
          .textContent()
          .then((t) => t?.includes('utilisé 1 fois') ?? false),
      true,
      'usage',
    );
    await pdfCard.getByRole('button', { name: /^Retirer/ }).click();
    await page.getByRole('alert').filter({ hasText: 'Média utilisé par 1' }).waitFor({ timeout: 2000 });
    await page.getByRole('button', { name: 'Médiathèque', exact: true }).click();
  },
);

await check(
  'Composants interactifs : onglets et accordéon depuis la bibliothèque, clavier dans l’aperçu (SB-07)',
  async () => {
    await page.locator('.pages .pages-item').first().click();
    await page.locator('.library').getByRole('button', { name: 'Bloc d’onglets' }).click();
    await page.locator('.library').getByRole('button', { name: 'Accordéon (FAQ)' }).click();
    // The canvas runs the tabs island: same enhanced markup as the export.
    await eventually(
      () => canvas.locator('[role="tablist"]').isVisible(),
      true,
      'onglets actifs dans le canvas',
    );
    await eventually(() => canvas.locator('details.ns-accordion-item[open]').count(), 1, 'accordéon');
    const pending = page.context().waitForEvent('page');
    await page.getByRole('button', { name: 'Aperçu du site' }).click();
    const preview = await pending;
    const tabs = preview.getByRole('tab');
    await tabs.first().waitFor({ timeout: 5000 });
    await tabs.first().focus();
    await preview.keyboard.press('ArrowRight');
    await eventually(() => tabs.nth(1).getAttribute('aria-selected'), 'true', 'flèche droite');
    await eventually(
      () => preview.getByRole('tabpanel').locator('p').textContent(),
      'Contenu de l’onglet 2.',
      'panneau affiché',
    );
    const violations = await accessibility(preview);
    expect(violations.length === 0, JSON.stringify(violations));
    await preview.close();
  },
);

await check(
  'Composants réutilisables : enregistrer, réutiliser sur 2 pages, propager, incompatibilité signalée (CS-01, CS-03)',
  async () => {
    const items = page.locator('.pages .pages-list').first().locator('.pages-item');
    const library = page.locator('.library');
    const headingColor = (text: string) =>
      canvas.getByRole('heading', { name: text }).evaluate((el) => getComputedStyle(el).color);
    await items.nth(1).click();
    await library.getByRole('button', { name: 'Carte', exact: true }).click();
    await page.getByRole('button', { name: 'Créer un composant réutilisable' }).click();
    const create = page.getByRole('dialog', { name: 'Créer un composant' });
    await create.getByLabel('Nom').fill('Carte offre');
    await create.getByLabel('Catégorie').selectOption({ label: 'Atouts' });
    await create.getByRole('button', { name: 'Créer' }).click();
    await page.getByText('Version 1 (à jour)').waitFor({ timeout: 2000 });
    // Reused, linked, on another page, with its own title.
    await items.nth(2).click();
    await library.getByRole('radio', { name: 'Sections' }).click();
    await library.getByRole('button', { name: 'Insérer « Carte offre » liée' }).click();
    await library.getByRole('radio', { name: 'Composants' }).click();
    await page.getByLabel('Titre — Texte', { exact: true }).fill('Offre Pro');
    await page.getByLabel('Titre — Texte', { exact: true }).blur();
    await canvas.getByRole('heading', { name: 'Offre Pro' }).waitFor({ timeout: 2000 });
    // New version of the definition, published then propagated to both pages.
    const component = page.locator('.pages .pages-item', { hasText: 'Carte offre' });
    await component.click();
    await page
      .locator('.tree-row')
      .filter({ has: page.locator('.tree-label', { hasText: /^Titre$/ }) })
      .click();
    await page.getByLabel('Couleur du texte', { exact: true }).fill('#dc2626');
    // Escape deselects only outside of a field.
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Publier la version 2' }).click();
    await page.getByRole('button', { name: 'Mettre à jour les instances' }).click();
    await page
      .getByRole('dialog', { name: 'Mettre à jour les instances' })
      .getByRole('button', { name: 'Mettre à jour' })
      .click();
    await items.nth(2).click();
    await eventually(() => headingColor('Offre Pro'), 'rgb(220, 38, 38)', 'propagé, valeur propre conservée');
    await items.nth(1).click();
    await eventually(
      () => headingColor('Titre de la carte'),
      'rgb(220, 38, 38)',
      'propagé sur la page d’origine',
    );
    // Incompatible: the title the second instance overrides no longer exists in version 3.
    await component.click();
    await page
      .locator('.tree-row')
      .filter({ has: page.locator('.tree-label', { hasText: /^Titre$/ }) })
      .click();
    await page.keyboard.press('Delete');
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Publier la version 3' }).click();
    await page.getByRole('button', { name: 'Mettre à jour les instances' }).click();
    // The review shows the diff and what is left out before anything changes.
    const review = page.getByRole('dialog', { name: 'Mettre à jour les instances' });
    const message = (await review.textContent()) ?? '';
    expect(/1 instance mise à jour.*valeurs incompatibles/s.test(message), message);
    expect(message.includes('éléments supprimés'), `diff : ${message}`);
    await review.getByRole('button', { name: 'Mettre à jour' }).click();
    // Every operation is journaled, without content.
    await page.getByRole('button', { name: 'Journal des opérations' }).click();
    const journal = page.getByRole('list', { name: 'Journal des opérations' });
    await journal.getByText('Mettre à jour les instances').first().waitFor({ timeout: 2000 });
    expect(!((await journal.textContent()) ?? '').includes('Offre Pro'), 'aucun contenu dans le journal');
    await page.getByRole('button', { name: 'Journal des opérations' }).click();
    await items.nth(2).click();
    await canvas.getByRole('heading', { name: 'Offre Pro' }).waitFor({ timeout: 2000 });
    await items.nth(1).click();
    await eventually(
      () => canvas.getByRole('heading', { name: 'Titre de la carte' }).count(),
      0,
      'version 3 appliquée',
    );
    await saveButton.click();
    await eventually(status, 'Enregistré', 'statut');
  },
);

await check(
  'Animations : ajout depuis l’inspecteur, Rejouer dans le canvas, mouvement réduit simulé (CS-05, CS-07)',
  async () => {
    await page.locator('.pages .pages-list').first().locator('.pages-item').first().click();
    await page
      .locator('.tree-row')
      .filter({ has: page.locator('.tree-label', { hasText: /^Titre$/ }) })
      .first()
      .click();
    const section = page.locator('.ui-section', { hasText: 'Ajouter une animation' });
    await section.getByRole('button', { name: 'Ajouter une animation' }).click();
    await section.getByLabel('Déclencheur').selectOption({ label: 'Au chargement' });
    const animations = () =>
      canvas
        .locator('h1, h2')
        .first()
        .evaluate((el) => el.getAnimations().length);
    // Edits never replay animations in the canvas; « Rejouer » does.
    expect((await animations()) === 0, 'aucune animation jouée pendant l’édition');
    await section.getByRole('button', { name: 'Rejouer' }).click();
    await eventually(async () => (await animations()) > 0, true, 'animation rejouée');
    await section.getByLabel('Simuler « mouvement réduit » (aucune animation)').check();
    expect(
      await section.getByRole('button', { name: 'Rejouer' }).isDisabled(),
      'Rejouer désactivé en mouvement réduit',
    );
    await section.getByLabel('Simuler « mouvement réduit » (aucune animation)').uncheck();
    await section.getByRole('button', { name: 'Supprimer l’animation' }).click();
    await eventually(() => section.getByLabel('Déclencheur').count(), 0, 'animation supprimée');
  },
);

await check(
  'Composition directe : poignée de redimensionnement (1 annulation, bornée au parent), alignement (CS-04)',
  async () => {
    await page.locator('.pages .pages-list').first().locator('.pages-item').first().click();
    await page
      .locator('.tree-row')
      .filter({ has: page.locator('.tree-label', { hasText: /^Titre$/ }) })
      .first()
      .click();
    const heading = canvas.locator('h1, h2').first();
    const width = () => heading.evaluate((el) => Math.round(el.getBoundingClientRect().width));
    const before = await width();
    const handle = await box(page.locator('.resize-x'));
    await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
    await page.mouse.down();
    for (let i = 1; i <= 5; i++) await page.mouse.move(handle.x - i * 30, handle.y + handle.height / 2);
    await page.mouse.up();
    await eventually(async () => (await width()) < before - 100, true, 'largeur réduite');
    // Dragging far beyond the parent never exceeds its width.
    const parentWidth = await heading.evaluate((el) =>
      Math.round((el.parentElement as HTMLElement).getBoundingClientRect().width),
    );
    const again = await box(page.locator('.resize-x'));
    await page.mouse.move(again.x + 2, again.y + 4);
    await page.mouse.down();
    await page.mouse.move(again.x + 900, again.y + 4);
    await page.mouse.up();
    await eventually(async () => (await width()) <= parentWidth, true, 'bornée au parent');
    await undo.click();
    await undo.click();
    await eventually(width, before, 'deux gestes, deux annulations');
    await page
      .getByRole('toolbar', { name: 'Aligner dans le parent' })
      .getByRole('button', { name: 'Centrer' })
      .click();
    await eventually(
      () => heading.evaluate((el) => getComputedStyle(el).alignSelf),
      'center',
      'centré dans le parent',
    );
    await undo.click();
  },
);

let archivePath = '';
await check('SEO, contrôles bloquants avant export, archive du projet (SB-08, SB-11, SB-12)', async () => {
  await page.locator('.pages .pages-item').first().click();
  await page.keyboard.press('Escape');
  await page.getByLabel('Meta description (≈ 160 caractères)').fill('Atelier de création de sites rapides.');
  await page.getByLabel('Meta description (≈ 160 caractères)').blur();
  // « À propos » is in the main menu: unpublishing it breaks an internal link → blocking error.
  await page.locator('.pages .pages-item', { hasText: 'À propos' }).click();
  await page.getByLabel("Publier (inclure dans l'export)").uncheck();
  await page.getByRole('button', { name: 'Plus d’actions' }).click();
  await page.getByRole('menuitem', { name: 'Exporter le site (Astro)…' }).click();
  const dialog = page.getByRole('dialog', { name: 'Exporter le site' });
  await dialog
    .getByText(/lien vers « À propos », page non publiée/)
    .first()
    .waitFor({ timeout: 5000 });
  expect(await dialog.getByRole('button', { name: 'Exporter', exact: true }).isDisabled(), 'export bloqué');
  await dialog.getByRole('button', { name: 'Fermer' }).click();
  await page.getByLabel("Publier (inclure dans l'export)").check();
  await saveButton.click();
  await eventually(status, 'Enregistré', 'statut');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Plus d’actions' }).click();
  await page.getByRole('menuitem', { name: 'Exporter l’archive (site et médias)' }).click();
  archivePath = join(work, 'archive.json');
  await (await download).saveAs(archivePath);
  const archive = JSON.parse(await readFile(archivePath, 'utf8')) as {
    format: string;
    site: { pages: { seo?: { description?: string } }[] };
  };
  expect(archive.format === 'ns.archive', 'format');
  expect(archive.site.pages[0]?.seo?.description === 'Atelier de création de sites rapides.', 'SEO archivé');
});

await check('Projets : import JSON invalide refusé avec diagnostics, duplication, corbeille', async () => {
  await page.getByRole('link', { name: 'Projets' }).click();
  await page.getByRole('heading', { name: 'Projets' }).waitFor({ timeout: 2000 });
  const bad = join(work, 'bad.json');
  await writeFile(
    bad,
    JSON.stringify({
      ...JSON.parse(await readFile(join(repo, 'fixtures/flex.json'), 'utf8')),
      schemaVersion: 7,
    }),
  );
  await page.locator('input[type="file"][accept*="json"]').setInputFiles(bad);
  await page.getByRole('alert').getByText('unsupported-version').waitFor({ timeout: 2000 });
  const rows = page.locator('.projects-row');
  expect((await rows.count()) === 1, 'aucun projet créé');
  await rows
    .first()
    .getByRole('button', { name: /^Dupliquer/ })
    .click();
  await eventually(() => rows.count(), 2, 'copie listée');
  await rows
    .filter({ hasText: '(copie)' })
    .getByRole('button', { name: /^Supprimer/ })
    .click();
  await eventually(() => rows.count(), 1, 'copie supprimée');
  expect((await readdir(join(work, 'data/trash'))).length === 1, 'copie dans la corbeille');
  // Re-import of the archive downloaded from the editor: a new project, media included.
  await page.locator('input[type="file"][accept*="json"]').setInputFiles(archivePath);
  await page.locator('.pages').waitFor({ timeout: 5000 });
  await page.getByRole('link', { name: 'Projets' }).click();
  await eventually(() => rows.count(), 2, 'archive réimportée');
});

await check(
  'Modèle de site : projet complet créé depuis « Atelier Nord », exporté sans erreur (CS-02)',
  async () => {
    await page
      .getByRole('link', { name: 'Projets' })
      .click()
      .catch(() => {});
    await page.getByRole('heading', { name: 'Projets' }).waitFor({ timeout: 2000 });
    await page.getByLabel('Nom du projet').fill('Atelier de test');
    await page.getByLabel('Modèle').selectOption({ label: 'Atelier Nord — site vitrine (5 pages)' });
    await page.getByRole('button', { name: 'Créer le projet' }).click();
    await page.locator('.pages').waitFor({ timeout: 5000 });
    await eventually(
      () => page.locator('.pages .pages-list').first().locator('.pages-item').count(),
      5,
      'pages du modèle',
    );
    await canvas.locator('header nav').first().waitFor({ timeout: 5000 });
    expect(
      (await page.locator('.toolbar .project-name').textContent()) === 'Atelier de test',
      'nom du projet',
    );
    await page.getByRole('button', { name: 'Plus d’actions' }).click();
    await page.getByRole('menuitem', { name: 'Exporter le site (Astro)…' }).click();
    const dialog = page.getByRole('dialog', { name: 'Exporter le site' });
    await dialog.getByText('Contrôles avant export').waitFor({ timeout: 5000 });
    expect((await dialog.getByText(/erreur\(s\) bloquante/).count()) === 0, 'aucune erreur bloquante');
    await dialog.getByRole('button', { name: 'Exporter', exact: true }).click();
    await dialog.getByText('Sources Astro').waitFor({ timeout: 15000 });
    await dialog.getByRole('button', { name: 'Fermer' }).click();
  },
);

await check(
  'Assistant IA : proposition revue puis rejetée sans trace, acceptée en une annulation, journal « IA » (CS-08, CS-09)',
  async () => {
    const proposal = page.getByRole('dialog', { name: 'Proposition de l’assistant' });
    await page.getByRole('button', { name: 'Assistant IA' }).click();
    await page.getByRole('button', { name: 'SEO', exact: true }).click();
    await page.getByRole('button', { name: 'Proposer' }).click();
    const seo = (await proposal.textContent()) ?? '';
    expect(seo.includes('Site · pages modifié'), `revue : ${seo}`);
    await proposal.getByRole('button', { name: 'Rejeter' }).click();
    expect(await undo.isDisabled(), 'rejet : aucune entrée d’historique');
    await page.getByRole('button', { name: 'Section témoignages' }).click();
    await page.getByRole('button', { name: 'Proposer' }).click();
    expect(((await proposal.textContent()) ?? '').includes('3 éléments ajoutés'), 'diff des ajouts');
    await proposal.getByRole('button', { name: 'Accepter' }).click();
    const added = canvas.getByRole('heading', { name: 'Ils nous font confiance' });
    await added.waitFor({ timeout: 2000 });
    await page.getByRole('button', { name: 'Journal des opérations' }).click();
    const row = page.getByRole('list', { name: 'Journal des opérations' }).locator('li').first();
    const text = (await row.textContent()) ?? '';
    expect(text.includes('IA') && text.includes('Proposition de l’assistant'), `journal : ${text}`);
    expect(!text.includes('confiance'), 'aucun contenu dans le journal');
    await undo.click();
    await eventually(() => added.count(), 0, 'une seule annulation');
  },
);

await check('Aucune erreur dans la console (hors échecs réseau provoqués par les tests)', async () => {
  const expected = /ERR_FAILED|status of 412|status of 415|status of 422/;
  const unexpected = errors.filter((e) => !expected.test(e));
  expect(unexpected.length === 0, unexpected.join(' | '));
});

await browser.close();
app.server.close();
await rm(work, { recursive: true, force: true });
console.log(failures ? `\n${failures} échec(s)` : '\nTous les contrôles passent.');
process.exit(failures ? 1 : 0);
