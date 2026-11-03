// Milestone 2 demonstration (02-site-builder.md §6), fully reproducible: a five-page showcase site
// built through the Studio UI only (no code), with shared header and footer, menu, design system,
// media library, gallery, interactive components and SEO; checked, exported with its static build
// (npm ci + astro build outside the repository), then served by a plain static server with the
// Studio stopped, and verified: navigation, responsive menu, optimized images, metadata, sitemap,
// 404, JavaScript only where needed, accessibility (axe).
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium, type Page } from 'playwright';
import { createApi } from '../../apps/studio/dev-server/api.ts';
import { accessibility } from '../fidelity/compare.ts';
import { serve } from '../serve.ts';

const repo = join(import.meta.dirname, '../..');
const results: string[] = [];
const step = (s: string) => console.log(`→ ${s}`);
const fail = (message: string): never => {
  throw new Error(message);
};
const PAGES = [
  {
    title: 'Accueil',
    slug: '',
    description: 'Atelier Nord conçoit des sites vitrines rapides, sûrs et autonomes.',
  },
  {
    title: 'Présentation',
    slug: 'presentation',
    description: 'Une équipe indépendante à Lille, au service des TPE.',
  },
  { title: 'Services', slug: 'services', description: 'Conseil, création et suivi de sites vitrines.' },
  {
    title: 'Réalisations',
    slug: 'realisations',
    description: 'Une sélection de sites réalisés pour nos clients.',
  },
  { title: 'Contact', slug: 'contact', description: 'Écrivez-nous pour parler de votre projet.' },
];

step('Build du Studio');
execFileSync('npm', ['run', 'build', '-w', '@ns/studio'], { cwd: repo, stdio: 'pipe' });
const work = await mkdtemp(join(tmpdir(), 'ns-demo-site-'));
const api = createApi({ dataDir: join(work, 'data'), mediaDirs: [], exportsDir: join(work, 'exports') });
const app = await serve(join(repo, 'apps/studio/dist'), { middleware: api });
const browser = await chromium.launch();
// A French browser: the Studio opens in French (ADR-0024), the language of these scenarios and of the guide.
const page = await browser.newPage({ locale: 'fr-FR', viewport: { width: 1600, height: 1000 } });
page.on('dialog', (d) => void d.accept());
const errors: string[] = [];
page.on('pageerror', (e) => errors.push(e.message));

const library = (name: string) => page.locator('.library').getByRole('button', { name, exact: true });
const row = (label: string, nth = 0) =>
  page
    .locator('.tree-row')
    .filter({ has: page.locator('.tree-label', { hasText: new RegExp(`^${label}$`) }) })
    .nth(nth);
const fill = async (label: string, value: string, scope: Pick<Page, 'getByLabel'> = page) => {
  const input = scope.getByLabel(label, { exact: true });
  await input.fill(value);
  await input.blur();
};
const deselect = () => page.keyboard.press('Escape');
const openPage = async (title: string) => {
  await page.locator('.pages .pages-item', { hasText: title }).first().click();
  await deselect();
};
async function richText(text: string) {
  await page.locator('.rt-editor').click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.type(text);
  await page.locator('.rt-editor').blur();
}
/** Selects an image of the media library in the image field of the selected node. */
async function useMedia(name: string) {
  const select = page.locator('aside fieldset').getByLabel('Médiathèque');
  const value = await select.evaluate(
    (s, n) => [...(s as HTMLSelectElement).options].find((o) => o.text.startsWith(n))?.value ?? '',
    name,
  );
  if (!value) fail(`média ${name} absent de la médiathèque`);
  await select.selectOption(value);
}
async function heading(text: string, level: string) {
  await deselect();
  await library('Titre').click();
  await page.getByLabel('Niveau', { exact: true }).selectOption({ label: level });
  await fill('Texte', text);
}
async function paragraph(text: string) {
  await deselect();
  await library('Texte').click();
  await richText(text);
}

/** Closed in `finally`, so a failed check never leaves the process running. */
let staticServer: { close: () => unknown } | undefined;
try {
  await mkdir(join(repo, 'test-results'), { recursive: true });
  step('Médias de démonstration (images générées, logo SVG)');
  const media = join(work, 'media');
  await mkdir(media, { recursive: true });
  const images = [
    ['atelier.jpg', '#0f766e', '#1e3a8a', 'Atelier'],
    ['equipe.jpg', '#9333ea', '#f59e0b', 'Équipe'],
    ['projet-1.jpg', '#0ea5e9', '#22c55e', 'Projet 1'],
    ['projet-2.jpg', '#f43f5e', '#8b5cf6', 'Projet 2'],
    ['projet-3.jpg', '#f97316', '#0f766e', 'Projet 3'],
  ] as const;
  for (const [file, from, to, label] of images) {
    const data = await page.evaluate(
      ([a, b, text]) => {
        const c = document.createElement('canvas');
        c.width = 1600;
        c.height = 1000;
        const g = c.getContext('2d') as CanvasRenderingContext2D;
        const grad = g.createLinearGradient(0, 0, 1600, 1000);
        grad.addColorStop(0, a);
        grad.addColorStop(1, b);
        g.fillStyle = grad;
        g.fillRect(0, 0, 1600, 1000);
        g.fillStyle = 'rgba(255,255,255,.85)';
        g.font = 'bold 140px sans-serif';
        g.fillText(text, 120, 600);
        return c.toDataURL('image/jpeg', 0.85).split(',')[1] ?? '';
      },
      [from, to, label] as const,
    );
    await writeFile(join(media, file), Buffer.from(data, 'base64'));
  }

  step('Projet « Atelier Nord » depuis le modèle « Page vide »');
  await page.goto(`${app.url}/`);
  await page.getByLabel('Nom du projet').fill('Atelier Nord');
  await page.getByLabel('Modèle').selectOption({ value: 'blank' });
  await page.getByRole('button', { name: 'Créer le projet' }).click();
  await page.locator('.pages').waitFor();
  await deselect();
  await fill('URL canonique (https://exemple.fr)', 'https://atelier-nord.example');
  await fill('Titre', 'Accueil');

  step('Design system : couleur primaire, police et styles de texte');
  const dsButton = page.getByRole('button', { name: 'Design system' });
  await dsButton.click();
  const ds = page.getByRole('complementary', { name: 'Design system' });
  await ds.getByRole('button', { name: 'Ajouter une couleur' }).click();
  await ds.getByLabel('Couleur — valeur').fill('#0f766e');
  await fill('Nom', 'Primaire', ds.locator('.ds-row').first());
  await ds.getByRole('button', { name: 'Ajouter une police' }).click();
  await fill('Familles, par ordre de préférence', 'Georgia, Times New Roman, serif', ds);
  await ds.getByRole('button', { name: 'Titre 1', exact: true }).click();
  const h1Style = ds.locator('.ds-text').first();
  await h1Style.getByLabel('Police').selectOption({ label: 'Police' });
  await h1Style.getByLabel('Graisse').selectOption('700');
  await fill('Taille · Base', '52', h1Style);
  await fill('Taille · Mobile', '36', h1Style);
  await dsButton.click();

  step('Médiathèque : import des images et du logo, textes alternatifs');
  const libraryButton = page.getByRole('button', { name: 'Médiathèque', exact: true });
  await libraryButton.click();
  const lib = page.getByRole('complementary', { name: 'Médiathèque' });
  await lib.locator('input[type="file"]').setInputFiles(images.map(([f]) => join(media, f)));
  await page.waitForFunction(() => document.querySelectorAll('.media-card').length === 5);
  for (const [file, , , label] of images) {
    const card = lib.locator(`.media-card[aria-label="${file}"]`);
    await fill('Texte alternatif par défaut', `Illustration : ${label.toLowerCase()}`, card);
    if (file.startsWith('projet')) await fill('Tags (séparés par des virgules)', 'réalisation', card);
  }
  await libraryButton.click();

  step('Pages : Présentation, Services, Réalisations, Contact');
  for (const p of PAGES.slice(1)) {
    await page.locator('.pages').getByRole('button', { name: 'Ajouter une page' }).click();
    await deselect();
    await fill('Titre', p.title);
    await fill('Adresse (slug)', p.slug);
  }

  step('Header (logo, navigation responsive) et footer partagés');
  await page.locator('.pages').getByRole('button', { name: 'Créer le header' }).click();
  await page.locator('.pages').getByRole('button', { name: 'Créer le footer' }).click();

  step('Accueil : hero avec image, trois cartes, appel à l’action');
  await openPage('Accueil');
  await library('Hero').click();
  await row('Titre').click();
  await fill('Texte', 'Des sites vitrines rapides, sûrs et autonomes');
  await row('Texte').click();
  await richText('Nous concevons, publions et accompagnons votre site, sans dépendance à un CMS.');
  await row('Bouton').click();
  await fill('Libellé', 'Découvrir l’atelier');
  await page.getByLabel('Lien', { exact: true }).selectOption({ label: 'Présentation' });
  await row('Visuel').click();
  await page.keyboard.press('Delete');
  await row('Hero').click();
  await library('Image').click();
  await useMedia('atelier.jpg');
  await page.getByLabel('Chargement', { exact: true }).selectOption({ label: 'Immédiat (image principale)' });
  await deselect();
  await page.locator('.library').getByRole('button', { name: 'Rangée 3 colonnes' }).click();
  const cards = [
    ['Conseil', 'Un diagnostic clair de vos besoins.'],
    ['Création', 'Un site sur mesure, rapide et accessible.'],
    ['Suivi', 'Des évolutions et une maintenance sereines.'],
  ];
  for (const [i, [title, text]] of cards.entries()) {
    await row('Colonne', i).click();
    await page.locator('.library').getByRole('button', { name: 'Carte' }).click();
    await row('Titre', i + 1).click();
    await fill('Texte', title as string);
    await page.getByLabel('Niveau', { exact: true }).selectOption({ label: 'H2' });
    await row('Bouton', i + 1).click();
    await page.getByLabel('Lien', { exact: true }).selectOption({ label: 'Services' });
    await row('Texte', i + 1).click();
    await richText(text as string);
  }
  await deselect();
  await page.locator('.library').getByRole('button', { name: 'Appel à l’action' }).click();
  await page.getByLabel('Couleur de fond (token)').selectOption({ label: 'Primaire' });
  await row('Bouton', 4).click();
  await page.getByLabel('Lien', { exact: true }).selectOption({ label: 'Contact' });

  step('Présentation : titre, texte, image');
  await openPage('Présentation');
  await heading('Une équipe à taille humaine', 'H1');
  await paragraph(
    'Atelier Nord réunit design et développement pour des sites durables, sobres et accessibles.',
  );
  await deselect();
  await library('Image').click();
  await useMedia('equipe.jpg');

  step('Services : onglets et FAQ en accordéon');
  await openPage('Services');
  await heading('Nos services', 'H1');
  await deselect();
  await page.locator('.library').getByRole('button', { name: 'Bloc d’onglets' }).click();
  // The tabs preset has two tabs: the first two services.
  for (const [i, [title, text]] of cards.slice(0, 2).entries()) {
    await row('Onglet', i).click();
    await fill('Titre de l’onglet', title as string);
    await row('Texte', i).click();
    await richText(text as string);
  }
  await deselect();
  await page.locator('.library').getByRole('button', { name: 'Accordéon (FAQ)' }).click();

  step('Réalisations : galerie de trois images légendées');
  await openPage('Réalisations');
  await heading('Nos réalisations', 'H1');
  await deselect();
  await page.locator('.library').getByRole('button', { name: 'Grille d’images' }).click();
  for (const i of [0, 1, 2]) {
    await row('Image', i).click();
    await useMedia(`projet-${i + 1}.jpg`);
    await fill('Légende (facultative)', `Projet ${i + 1} — site vitrine`);
  }

  step('Contact : coordonnées et bouton e-mail');
  await openPage('Contact');
  await heading('Parlons de votre projet', 'H1');
  await paragraph('Atelier Nord, 12 rue des Arts, 59000 Lille. Réponse sous 48 heures ouvrées.');
  await deselect();
  await library('Bouton').click();
  await fill('Libellé', 'Écrire à contact@atelier-nord.example');
  await page.getByLabel('Lien', { exact: true }).selectOption({ label: 'Adresse (URL)' });
  await fill('Adresse', 'mailto:contact@atelier-nord.example');

  step('Métadonnées SEO de chaque page');
  for (const p of PAGES) {
    await openPage(p.title);
    await fill('Meta description (≈ 160 caractères)', p.description);
  }

  step('Enregistrer, puis contrôles, export Astro et build statique depuis le Studio');
  await page.keyboard.press('ControlOrMeta+s');
  await page.locator('.toolbar .status', { hasText: /^Enregistré$/ }).waitFor({ timeout: 5000 });
  if (process.argv.includes('--write-template')) {
    // Built-in site template (CS-02): the archive of this site, its generated media being redistributable.
    const projectId = /#\/p\/([a-z0-9]+)/.exec(page.url())?.[1] ?? fail('projet introuvable');
    const archive = await (await fetch(`${app.url}/api/projects/${projectId}/archive`)).json();
    const template = {
      ...archive,
      template: {
        name: 'Atelier Nord — site vitrine',
        description:
          'Cinq pages (accueil, présentation, services, réalisations, contact), header et footer, design system, galerie et médias de démonstration libres.',
      },
    };
    await mkdir(join(repo, 'templates'), { recursive: true });
    await writeFile(join(repo, 'templates/atelier-nord.json'), `${JSON.stringify(template)}\n`);
    results.push('- Modèle de site écrit : `templates/atelier-nord.json`.');
  }
  await page.getByRole('button', { name: 'Plus d’actions' }).click();
  await page.getByRole('menuitem', { name: 'Exporter le site (Astro)…' }).click();
  const dialog = page.getByRole('dialog', { name: 'Exporter le site' });
  await dialog.getByText('Contrôles avant export').waitFor({ timeout: 5000 });
  const warnings = await dialog.locator('.checks li').allTextContents();
  if (await dialog.getByText(/erreur\(s\) bloquante/).count())
    fail(`erreurs bloquantes : ${warnings.join(' | ')}`);
  await dialog.getByLabel(/Construire aussi le site statique/).check();
  await dialog.getByRole('button', { name: 'Exporter', exact: true }).click();
  const result = dialog.locator('.export-result');
  await result
    .waitFor({ timeout: 10 * 60_000 })
    .catch(async () => fail(`export : ${await dialog.textContent()}`));
  const [sourcesDir, staticDir] = (await result.locator('code').allTextContents()).map((t) => t.trim()) as [
    string,
    string,
  ];
  if (!staticDir) fail('build statique absent');
  results.push(
    `- Contrôles : 0 erreur, ${warnings.length} avertissement(s)${warnings.length ? ` (${warnings.join(' ; ')})` : ''}.`,
    `- Sources Astro : \`${sourcesDir}\` ; site statique : \`${staticDir}\` (\`npm ci\` + \`astro build\` lancés par le Studio).`,
  );

  step('Arrêt du Studio, puis le site statique servi par un serveur HTTP quelconque');
  app.server.close();
  const site = await serve(staticDir);
  staticServer = site.server;
  const visitor = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const pageErrors: string[] = [];
  visitor.on('pageerror', (e) => pageErrors.push(e.message));
  const rows: string[] = [];
  for (const p of PAGES) {
    const res = await visitor.goto(`${site.url}/${p.slug ? `${p.slug}/` : ''}`);
    const title = await visitor.title();
    const description = await visitor.locator('meta[name="description"]').getAttribute('content');
    const canonical = await visitor.locator('link[rel="canonical"]').getAttribute('href');
    const scripts = await visitor.locator('script').count();
    const srcset = await visitor.locator('img[srcset*=".webp"]').count();
    const a11y = await accessibility(visitor);
    // No horizontal scrolling, desktop and mobile (a flex item may not impose its intrinsic width).
    for (const width of [1280, 390]) {
      await visitor.setViewportSize({ width, height: 900 });
      if (await visitor.evaluate(() => document.documentElement.scrollWidth > innerWidth))
        fail(`${p.title} : défilement horizontal à ${width}px`);
    }
    await visitor.setViewportSize({ width: 1280, height: 900 });
    if (
      res?.status() !== 200 ||
      description !== p.description ||
      !canonical?.startsWith('https://atelier-nord.example/')
    )
      fail(`${p.title} : statut ${res?.status()}, description ${description}, canonical ${canonical}`);
    if (a11y.length) fail(`${p.title} : violations axe ${JSON.stringify(a11y)}`);
    if (scripts > 0 !== (p.slug === 'services')) fail(`${p.title} : ${scripts} script(s)`);
    rows.push(
      `| ${p.title} | \`/${p.slug ? `${p.slug}/` : ''}\` | ${title} | ${srcset} | ${scripts} | aucune |`,
    );
  }
  await visitor.screenshot({ path: join(repo, 'test-results/demo-site-contact.png'), fullPage: true });

  // Navigation through the menu, desktop then mobile (folded menu, no JavaScript needed).
  await visitor.goto(`${site.url}/`);
  for (const p of PAGES.slice(1)) {
    await visitor.locator('header .ns-nav-bar').getByRole('link', { name: p.title }).click();
    await visitor.waitForURL(`${site.url}/${p.slug}/`);
    if ((await visitor.locator('header [aria-current="page"]').first().textContent()) !== p.title)
      fail(`page courante non signalée : ${p.title}`);
  }
  await visitor.goto(`${site.url}/`);
  await visitor.screenshot({ path: join(repo, 'test-results/demo-site-1280.png'), fullPage: true });
  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    javaScriptEnabled: false,
  });
  const phone = await mobile.newPage();
  await phone.goto(`${site.url}/`);
  if (await phone.locator('header .ns-nav-bar').isVisible()) fail('barre de navigation visible en mobile');
  await phone.locator('header summary').click();
  await phone.locator('header .ns-nav-menu').getByRole('link', { name: 'Réalisations' }).click();
  await phone.waitForURL(`${site.url}/realisations/`);
  await phone.screenshot({ path: join(repo, 'test-results/demo-site-390.png'), fullPage: true });
  const services = await phone.goto(`${site.url}/services/`);
  if (services?.status() !== 200 || !(await phone.locator('.ns-tab-title').first().isVisible()))
    fail('onglets illisibles sans JavaScript');
  await mobile.close();

  const notFound = await visitor.goto(`${site.url}/404.html`);
  if (
    !(await visitor.getByRole('heading', { name: 'Page introuvable' }).isVisible()) ||
    notFound?.status() !== 200
  )
    fail('page 404');
  const sitemap = await readFile(join(staticDir, 'sitemap.xml'), 'utf8');
  const urls = sitemap.match(/<loc>/g)?.length ?? 0;
  if (urls !== 5) fail(`sitemap : ${urls} URL`);
  const robots = await readFile(join(staticDir, 'robots.txt'), 'utf8');
  if (!robots.includes('Sitemap: https://atelier-nord.example/sitemap.xml')) fail('robots.txt');
  const webp = (await readdir(join(staticDir, '_astro'))).filter((f) => f.endsWith('.webp')).length;
  site.server.close();
  if (pageErrors.length || errors.length)
    fail(`erreurs JavaScript : ${[...pageErrors, ...errors].join(' | ')}`);

  const report = [
    `# Démonstration du jalon 2 — ${new Date().toISOString()}`,
    '',
    'Site vitrine « Atelier Nord » de cinq pages, construit uniquement dans l’interface du Studio depuis « Page vide » :',
    'design system (couleur, police, style de titre responsive), médiathèque (5 images), header et footer partagés avec',
    'menu responsive, hero, cartes, appel à l’action, onglets, FAQ, galerie légendée, bouton e-mail, SEO par page.',
    '',
    ...results,
    '- Studio arrêté, site statique servi par un serveur HTTP de test (aucun service Netvolution).',
    '- Aucun défilement horizontal à 1280 et 390 px sur les 5 pages.',
    `- Navigation par le menu sur les 5 pages (page courante signalée) ; menu replié en mobile ouvert **sans JavaScript**.`,
    `- \`404.html\` ; \`sitemap.xml\` (${urls} URL) ; \`robots.txt\` avec le sitemap ; ${webp} variantes WebP générées.`,
    '',
    '| Page | Adresse | Titre | Images avec `srcset` WebP | `<script>` | Violations a11y graves (axe) |',
    '|---|---|---|---|---|---|',
    ...rows,
    '',
    'Captures : `test-results/demo-site-1280.png`, `demo-site-390.png` (menu ouvert sans JS), `demo-site-contact.png`.',
    '',
  ].join('\n');
  await writeFile(join(repo, 'test-results/demo-site-report.md'), report);
  console.log(`\n${report}\nDémonstration réussie.`);
} catch (e) {
  await mkdir(join(repo, 'test-results'), { recursive: true });
  await page.screenshot({ path: join(repo, 'test-results/demo-site-failure.png') }).catch(() => {});
  console.error(e);
  process.exitCode = 1;
} finally {
  await browser.close();
  app.server.close();
  staticServer?.close();
  await rm(work, { recursive: true, force: true });
}
