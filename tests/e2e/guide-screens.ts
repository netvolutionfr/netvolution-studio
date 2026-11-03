// Screenshots of the user guide, in English (docs/guide/images/) and French (docs/guide/fr/images/), taken
// while replaying its tutorial (01-getting-started.md) in the built Studio: a failing step means the
// tutorial is out of date. Each language opens the Studio in a browser of that language, on the version
// of the Atelier Nord template in that language (ADR-0024).
// Usage: npm run guide:screenshots [en|fr]
import { execFileSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LOCALES } from '@ns/core';
import { type Browser, chromium, type Locator } from 'playwright';
import { aiConfigFromEnv } from '../../apps/studio/dev-server/ai/service.ts';
import { createApi } from '../../apps/studio/dev-server/api.ts';
import { serve } from '../serve.ts';

type Lang = 'en' | 'fr';
const repo = join(import.meta.dirname, '../..');
const step = (s: string) => console.log(`→ ${s}`);

type Tree = { [key: string]: string | Tree };
const flatten = (tree: Tree, prefix = ''): [string, string][] =>
  Object.entries(tree).flatMap(([k, v]) =>
    typeof v === 'string' ? [[`${prefix}${k}`, v] as [string, string]] : flatten(v, `${prefix}${k}.`),
  );
const en = new Map(flatten(LOCALES.en.messages as Tree));
/** French interface text → the same text in English, found through the catalogs (ambiguity is an error). */
const english = new Map<string, Set<string>>();
for (const [key, fr] of flatten(LOCALES.fr.messages as Tree)) {
  const value = en.get(key);
  if (value !== undefined) english.set(fr, (english.get(fr) ?? new Set()).add(value));
}

async function capture(browser: Browser, url: string, lang: Lang) {
  const images = join(repo, lang === 'fr' ? 'docs/guide/fr/images' : 'docs/guide/images');
  /** An interface label, written in French, in the language of the run. */
  const t = (fr: string) => {
    if (lang === 'fr') return fr;
    const found = [...(english.get(fr) ?? [])];
    if (found.length !== 1) throw new Error(`No single English text for « ${fr} »: ${found.join(' | ')}`);
    return found[0] as string;
  };
  /** Content of the site (Atelier Nord) or typed by the tutorial, in both languages. */
  const L = (fr: string, en: string) => (lang === 'fr' ? fr : en);

  const page = await browser.newPage({ locale: L('fr-FR', 'en-US'), viewport: { width: 1440, height: 900 } });
  page.on('dialog', (d) => void d.accept());
  const canvas = page.frameLocator(`iframe[title="${t('Aperçu de la page')}"]`);
  const library = page.locator('.library');
  const shot = async (name: string, target: Locator | null = null) => {
    await page.waitForTimeout(300);
    const path = join(images, `${name}.png`);
    await (target ? target.screenshot({ path }) : page.screenshot({ path }));
  };
  const row = (label: string) =>
    page
      .locator('.tree-row')
      .filter({ has: page.locator('.tree-label', { hasText: new RegExp(`^${label}$`) }) });
  const fill = async (label: string, value: string, scope: Locator = page.locator('body')) => {
    const input = scope.getByLabel(label, { exact: true });
    await input.fill(value);
    await input.blur();
  };
  const saved = new RegExp(`^${t('Enregistré')}$`);
  const home = L('Accueil', 'Home');

  step(`[${lang}] Projects screen: new project from the Atelier Nord template`);
  await page.goto(`${url}/`);
  await page.getByLabel(t('Nom du projet')).fill('Studio Martin');
  await page.getByLabel(t('Modèle')).selectOption({
    label: L('Atelier Nord — site vitrine (5 pages)', 'Atelier Nord — showcase website (5 pages)'),
  });
  await shot('projects', page.locator('.projects-inner'));
  await page.getByRole('button', { name: t('Créer le projet') }).click();
  await page.locator('.pages').waitFor({ timeout: 5000 });
  await page.keyboard.press('Escape');
  await shot('editor');

  step(`[${lang}] Hero heading changed in the inspector`);
  await canvas.locator('h1').first().click();
  await shot('selection');
  await fill(
    t('Texte'),
    L('Studio Martin, graphisme et sites web', 'Studio Martin, graphic design and websites'),
  );
  await shot('inspector', page.locator('aside.inspector'));

  step(`[${lang}] Pricing page added, with a section of the library`);
  const pricing = L('Tarifs', 'Pricing');
  await page.getByRole('button', { name: t('Ajouter une page') }).click();
  await page.keyboard.press('Escape');
  await fill(L('Titre', 'Title'), pricing);
  await fill(t('Adresse (slug)'), pricing.toLowerCase());
  await library.getByRole('button', { name: t('Appel à l’action'), exact: true }).click();
  await page.keyboard.press('Escape');
  await shot('new-page');

  step(`[${lang}] Pricing entry added to the main menu`);
  await page.getByRole('button', { name: t('Menus') }).click();
  const menu = page.locator('aside.inspector');
  await menu
    .getByRole('button', { name: t('Ajouter une entrée') })
    .first()
    .click();
  const last = menu.locator('.menu-row').last();
  await fill(t('Libellé'), pricing, last);
  await last
    .getByLabel(t('Lien'), { exact: true })
    .selectOption({ label: `${pricing}${t(' (cette page)')}` });
  await shot('menus', last);
  await page.getByRole('button', { name: t('Menus') }).click();

  step(`[${lang}] Mobile display`);
  await page.getByRole('radio', { name: t('Mobile') }).click();
  await shot('mobile');
  await page.getByRole('radio', { name: t('Desktop') }).click();

  step(`[${lang}] Saving and pre-export checks`);
  await page.keyboard.press('ControlOrMeta+s');
  await page.locator('.toolbar .status', { hasText: saved }).waitFor({ timeout: 5000 });
  await page.getByRole('button', { name: t('Plus d’actions') }).click();
  await page.getByRole('menuitem', { name: t('Exporter le site (Astro)…') }).click();
  const dialog = page.getByRole('dialog', { name: t('Exporter le site') });
  await dialog.getByText(t('Contrôles avant export')).waitFor({ timeout: 5000 });
  await shot('export', dialog);
  await dialog.getByRole('button', { name: t('Fermer') }).click();

  // Chapters 3 to 5, on the same project.
  step(`[${lang}] Building a page: row of columns, rich text, layers`);
  await page.keyboard.press('Escape');
  await library.getByRole('button', { name: t('Rangée 2 colonnes'), exact: true }).click();
  const column = L('Colonne', 'Column');
  await row(column).first().click();
  await library.getByRole('button', { name: L('Titre', 'Heading'), exact: true }).click();
  await row(column).first().click();
  await library.getByRole('button', { name: t('Texte'), exact: true }).click();
  await shot('tree', page.getByRole('navigation', { name: t('Arborescence') }));
  await shot('rich-text', page.locator('aside.inspector .ui-section').first());
  await page.keyboard.press('Escape');

  step(`[${lang}] Styling: the hero stack, on desktop then on mobile`);
  await page.locator('.pages .pages-item', { hasText: home }).first().click();
  await row('Hero').click();
  await shot('flex-stack', page.locator('aside.inspector'));
  await page.getByRole('radio', { name: t('Mobile') }).click();
  await shot('mobile-override', page.locator('aside.inspector'));
  await page.getByRole('radio', { name: t('Desktop') }).click();

  step(`[${lang}] Design system`);
  await page.getByRole('button', { name: t('Design system') }).click();
  await shot('design-system', page.locator('aside.inspector'));
  await page.getByRole('button', { name: t('Catalogue de polices…') }).click();
  const catalog = page.getByRole('dialog', { name: t('Catalogue de polices') });
  await catalog.getByText('Inter', { exact: true }).waitFor({ timeout: 5000 });
  await page.evaluate(() => document.fonts.ready);
  await shot('font-catalog', catalog);
  await catalog.getByRole('button', { name: t('Fermer') }).click();
  await page.getByRole('button', { name: t('Design system') }).click();

  // Chapters 6, 7 and 11.
  step(`[${lang}] The site: shared header, search and sharing`);
  await page.locator('.pages .pages-item', { hasText: 'Header' }).first().click();
  await page.keyboard.press('Escape');
  await shot('header');
  await page.locator('.pages .pages-item', { hasText: home }).first().click();
  await page.keyboard.press('Escape');
  await shot('seo', page.locator('aside.inspector .ui-section', { hasText: t('Référencement et partage') }));

  step(`[${lang}] Media: Image component, media library`);
  await page
    .locator('.pages .pages-item', { hasText: L('Réalisations', 'Work') })
    .first()
    .click();
  await canvas.locator('img').first().click();
  await shot('image', page.locator('aside.inspector'));
  const mediaButton = page.locator('.toolbar').getByRole('button', { name: t('Médiathèque'), exact: true });
  await mediaButton.click();
  await shot('media-library', page.locator('aside.inspector'));
  await mediaButton.click();

  step(`[${lang}] Publishing: export of the sources (without the static build, to stay fast)`);
  await page.keyboard.press('ControlOrMeta+s');
  await page.locator('.toolbar .status', { hasText: saved }).waitFor({ timeout: 5000 });
  await page.getByRole('button', { name: t('Plus d’actions') }).click();
  await page.getByRole('menuitem', { name: t('Exporter le site (Astro)…') }).click();
  await dialog.getByText(t('Contrôles avant export')).waitFor({ timeout: 5000 });
  await dialog.getByRole('button', { name: t('Exporter'), exact: true }).click();
  await dialog.locator('.export-result').waitFor({ timeout: 60_000 });
  await shot('export-result', dialog);
  await dialog.getByRole('button', { name: t('Fermer') }).click();

  // Chapters 8 to 10.
  step(`[${lang}] Reuse: sections, reusable component`);
  await page.locator('.pages .pages-item', { hasText: home }).first().click();
  await page.keyboard.press('Escape');
  await library.getByRole('radio', { name: t('Sections') }).click();
  await shot('sections', library.getByRole('listitem', { name: 'Hero', exact: true }));
  await library.getByRole('radio', { name: t('Composants') }).click();
  await row('Hero').first().click();
  await page.getByRole('button', { name: t('Créer un composant réutilisable') }).click();
  const create = page.getByRole('dialog', { name: t('Créer un composant') });
  const component = L('Hero accueil', 'Home hero');
  await create.getByLabel(t('Nom')).fill(component);
  await create.getByLabel(t('Catégorie')).selectOption({ label: 'Hero' });
  await create
    .getByLabel(t('Description'))
    .fill(L('Grand titre, texte, bouton et visuel', 'Large heading, text, button and visual'));
  await shot('create-component', create);
  await create.getByRole('button', { name: t('Créer') }).click();
  await page.getByText(L('Version 1 (à jour)', 'Version 1 (up to date)')).waitFor({ timeout: 3000 });
  await shot(
    'instance',
    page.locator('aside.inspector .ui-section', {
      hasText: L(`Composant « ${component} »`, `Component “${component}”`),
    }),
  );

  step(`[${lang}] Animations`);
  await page.getByRole('button', { name: t('Ajouter une animation') }).click();
  await shot(
    'animations',
    page.locator('aside.inspector .ui-section', { hasText: t('Ajouter une animation') }),
  );

  step(`[${lang}] AI assistant (simulated provider)`);
  await page.getByRole('button', { name: t('Assistant IA') }).click();
  await page.getByRole('button', { name: t('Variante sobre') }).click();
  await shot('assistant', page.locator('aside.inspector'));
  await page.getByRole('button', { name: t('Proposer') }).click();
  const review = page.getByRole('dialog', { name: t('Proposition de l’assistant') });
  await review.waitFor({ timeout: 5000 });
  await shot('assistant-proposal', review);
  await review.getByRole('button', { name: t('Rejeter') }).click();
  await page.close();
  console.log(`Screenshots in ${images}`);
}

step('Building the Studio');
execFileSync('npm', ['run', 'build', '-w', '@ns/studio'], { cwd: repo, stdio: 'pipe' });
const work = await mkdtemp(join(tmpdir(), 'ns-guide-'));
const app = await serve(join(repo, 'apps/studio/dist'), {
  middleware: createApi({
    dataDir: join(work, 'data'),
    templatesDir: join(repo, 'templates'),
    exportsDir: join(work, 'exports'),
    fontsDir: join(repo, 'fonts'),
    // Simulated provider (deterministic, no network) for the assistant chapter.
    ai: aiConfigFromEnv({ NS_AI_PROVIDER: 'simulated' }),
  }),
});
const browser = await chromium.launch();
try {
  const only = process.argv[2];
  for (const lang of ['en', 'fr'] as const) if (!only || only === lang) await capture(browser, app.url, lang);
} finally {
  await browser.close();
  app.server.close();
  await rm(work, { recursive: true, force: true });
}
