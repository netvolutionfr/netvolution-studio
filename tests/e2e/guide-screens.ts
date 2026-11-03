// Screenshots of the user guide (docs/guide/images/), taken while replaying its tutorial
// (01-prise-en-main.md) in the built Studio: a failing step means the tutorial is out of date.
// Usage: npm run guide:screenshots
import { execFileSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium, type Locator } from 'playwright';
import { aiConfigFromEnv } from '../../apps/studio/dev-server/ai/service.ts';
import { createApi } from '../../apps/studio/dev-server/api.ts';
import { serve } from '../serve.ts';

const repo = join(import.meta.dirname, '../..');
const images = join(repo, 'docs/guide/images');
const step = (s: string) => console.log(`→ ${s}`);

step('Build du Studio');
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
// A French browser: the Studio opens in French (ADR-0024), the language of these scenarios and of the guide.
const page = await browser.newPage({ locale: 'fr-FR', viewport: { width: 1440, height: 900 } });
page.on('dialog', (d) => void d.accept());
const canvas = page.frameLocator('iframe[title="Aperçu de la page"]');
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

try {
  step('Écran Projets : nouveau projet depuis le modèle Atelier Nord');
  await page.goto(`${app.url}/`);
  await page.getByLabel('Nom du projet').fill('Studio Martin');
  await page.getByLabel('Modèle').selectOption({ label: 'Atelier Nord — site vitrine (5 pages)' });
  await shot('projets', page.locator('.projects-inner'));
  await page.getByRole('button', { name: 'Créer le projet' }).click();
  await page.locator('.pages').waitFor({ timeout: 5000 });
  await page.keyboard.press('Escape');
  await shot('editeur');

  step('Titre du hero modifié dans l’inspecteur');
  await canvas.locator('h1').first().click();
  await shot('selection');
  await fill('Texte', 'Studio Martin, graphisme et sites web');
  await shot('inspecteur', page.locator('aside.inspector'));

  step('Page « Tarifs » ajoutée, avec une section de la bibliothèque');
  await page.getByRole('button', { name: 'Ajouter une page' }).click();
  await page.keyboard.press('Escape');
  await fill('Titre', 'Tarifs');
  await fill('Adresse (slug)', 'tarifs');
  await library.getByRole('button', { name: 'Appel à l’action', exact: true }).click();
  await page.keyboard.press('Escape');
  await shot('nouvelle-page');

  step('Entrée « Tarifs » ajoutée au menu principal');
  await page.getByRole('button', { name: 'Menus' }).click();
  const menu = page.locator('aside.inspector');
  await menu.getByRole('button', { name: 'Ajouter une entrée' }).first().click();
  const last = menu.locator('.menu-row').last();
  await fill('Libellé', 'Tarifs', last);
  await last.getByLabel('Lien', { exact: true }).selectOption({ label: 'Tarifs (cette page)' });
  await shot('menus', last);
  await page.getByRole('button', { name: 'Menus' }).click();

  step('Affichage mobile');
  await page.getByRole('radio', { name: 'Mobile' }).click();
  await shot('mobile');
  await page.getByRole('radio', { name: 'Desktop' }).click();

  step('Enregistrement et contrôles avant export');
  await page.keyboard.press('ControlOrMeta+s');
  await page.locator('.toolbar .status', { hasText: /^Enregistré$/ }).waitFor({ timeout: 5000 });
  await page.getByRole('button', { name: 'Plus d’actions' }).click();
  await page.getByRole('menuitem', { name: 'Exporter le site (Astro)…' }).click();
  const dialog = page.getByRole('dialog', { name: 'Exporter le site' });
  await dialog.getByText('Contrôles avant export').waitFor({ timeout: 5000 });
  await shot('export', dialog);
  await dialog.getByRole('button', { name: 'Fermer' }).click();

  // Chapters 3 to 5, on the same project.
  step('Construire une page : rangée de colonnes, texte enrichi, arborescence');
  await page.keyboard.press('Escape');
  await library.getByRole('button', { name: 'Rangée 2 colonnes', exact: true }).click();
  await row('Colonne').first().click();
  await library.getByRole('button', { name: 'Titre', exact: true }).click();
  await row('Colonne').first().click();
  await library.getByRole('button', { name: 'Texte', exact: true }).click();
  await shot('arborescence', page.getByRole('navigation', { name: 'Arborescence' }));
  await shot('texte-enrichi', page.locator('aside.inspector .ui-section').first());
  await page.keyboard.press('Escape');

  step('Mise en forme : la pile du hero, sur desktop puis sur mobile');
  await page.locator('.pages .pages-item', { hasText: 'Accueil' }).first().click();
  await row('Hero').click();
  await shot('pile-flex', page.locator('aside.inspector'));
  await page.getByRole('radio', { name: 'Mobile' }).click();
  await shot('surcharge-mobile', page.locator('aside.inspector'));
  await page.getByRole('radio', { name: 'Desktop' }).click();

  step('Design system');
  await page.getByRole('button', { name: 'Design system' }).click();
  await shot('design-system', page.locator('aside.inspector'));
  await page.getByRole('button', { name: 'Catalogue de polices…' }).click();
  const catalog = page.getByRole('dialog', { name: 'Catalogue de polices' });
  await catalog.getByText('Inter', { exact: true }).waitFor({ timeout: 5000 });
  await page.evaluate(() => document.fonts.ready);
  await shot('catalogue-polices', catalog);
  await catalog.getByRole('button', { name: 'Fermer' }).click();
  await page.getByRole('button', { name: 'Design system' }).click();

  // Chapters 6, 7 and 11.
  step('Le site : header partagé, référencement');
  await page.locator('.pages .pages-item', { hasText: 'Header' }).first().click();
  await page.keyboard.press('Escape');
  await shot('header');
  await page.locator('.pages .pages-item', { hasText: 'Accueil' }).first().click();
  await page.keyboard.press('Escape');
  await shot('seo', page.locator('aside.inspector .ui-section', { hasText: 'Référencement et partage' }));

  step('Les médias : composant Image, médiathèque');
  await page.locator('.pages .pages-item', { hasText: 'Réalisations' }).first().click();
  await canvas.locator('img').first().click();
  await shot('image', page.locator('aside.inspector'));
  await page.locator('.toolbar').getByRole('button', { name: 'Médiathèque', exact: true }).click();
  await shot('mediatheque', page.locator('aside.inspector'));
  await page.locator('.toolbar').getByRole('button', { name: 'Médiathèque', exact: true }).click();

  step('Publier : export des sources (sans build statique, pour rester rapide)');
  await page.keyboard.press('ControlOrMeta+s');
  await page.locator('.toolbar .status', { hasText: /^Enregistré$/ }).waitFor({ timeout: 5000 });
  await page.getByRole('button', { name: 'Plus d’actions' }).click();
  await page.getByRole('menuitem', { name: 'Exporter le site (Astro)…' }).click();
  await dialog.getByText('Contrôles avant export').waitFor({ timeout: 5000 });
  await dialog.getByRole('button', { name: 'Exporter', exact: true }).click();
  await dialog.locator('.export-result').waitFor({ timeout: 60_000 });
  await shot('export-resultat', dialog);
  await dialog.getByRole('button', { name: 'Fermer' }).click();

  // Chapters 8 to 10.
  step('Réutiliser : sections, composant réutilisable');
  await page.locator('.pages .pages-item', { hasText: 'Accueil' }).first().click();
  await page.keyboard.press('Escape');
  await library.getByRole('radio', { name: 'Sections' }).click();
  await shot('sections', library.getByRole('listitem', { name: 'Hero', exact: true }));
  await library.getByRole('radio', { name: 'Composants' }).click();
  await row('Hero').first().click();
  await page.getByRole('button', { name: 'Créer un composant réutilisable' }).click();
  const create = page.getByRole('dialog', { name: 'Créer un composant' });
  await create.getByLabel('Nom').fill('Hero accueil');
  await create.getByLabel('Catégorie').selectOption({ label: 'Hero' });
  await create.getByLabel('Description').fill('Grand titre, texte, bouton et visuel');
  await shot('creer-composant', create);
  await create.getByRole('button', { name: 'Créer' }).click();
  await page.getByText('Version 1 (à jour)').waitFor({ timeout: 3000 });
  await shot(
    'instance',
    page.locator('aside.inspector .ui-section', { hasText: 'Composant « Hero accueil »' }),
  );

  step('Animations');
  await page.getByRole('button', { name: 'Ajouter une animation' }).click();
  await shot('animations', page.locator('aside.inspector .ui-section', { hasText: 'Ajouter une animation' }));

  step('Assistant IA (fournisseur simulé)');
  await page.getByRole('button', { name: 'Assistant IA' }).click();
  await page.getByRole('button', { name: 'Variante sobre' }).click();
  await shot('assistant', page.locator('aside.inspector'));
  await page.getByRole('button', { name: 'Proposer' }).click();
  const review = page.getByRole('dialog', { name: 'Proposition de l’assistant' });
  await review.waitFor({ timeout: 5000 });
  await shot('assistant-proposition', review);
  await review.getByRole('button', { name: 'Rejeter' }).click();
} finally {
  await browser.close();
  app.server.close();
  await rm(work, { recursive: true, force: true });
}
console.log(`Captures dans ${images}`);
