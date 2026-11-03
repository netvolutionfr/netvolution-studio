// Comparative screenshots of the Studio UI (docs/ui/). Usage: node tests/e2e/screens.ts <prefix>
import { execFileSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { createApi } from '../../apps/studio/dev-server/api.ts';
import { serve } from '../serve.ts';

const prefix = process.argv[2] ?? 'capture';
const repo = join(import.meta.dirname, '../..');
execFileSync('npm', ['run', 'build', '-w', '@ns/studio'], { cwd: repo, stdio: 'pipe' });
const work = await mkdtemp(join(tmpdir(), 'ns-screens-'));
const app = await serve(join(repo, 'apps/studio/dist'), {
  middleware: createApi({
    dataDir: join(work, 'data'),
    mediaDirs: [join(repo, 'fixtures/media')],
    exportsDir: join(work, 'x'),
  }),
});
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const shot = async (name: string) => {
  await page.waitForTimeout(250);
  await page.screenshot({ path: join(repo, 'docs/ui', `${prefix}-${name}.png`) });
};
const row = (label: string) =>
  page
    .locator('.tree-row')
    .filter({ has: page.locator('.tree-label', { hasText: new RegExp(`^${label}$`) }) })
    .first();

try {
  await page.goto(`${app.url}/`);
  await page.getByLabel('Modèle').selectOption({ value: 'flex' });
  await page.getByRole('button', { name: 'Créer le projet' }).click();
  const canvas = page.frameLocator('iframe[title="Aperçu de la page"]');
  await canvas.locator('h1').click();
  await shot('1-titre');
  await row('Hero').click();
  await shot('2-layout');
  await page.getByRole('radio', { name: 'Mobile' }).click();
  await canvas.locator('p').first().click();
  await shot('3-mobile-texte');
  await page.getByRole('radio', { name: 'Desktop' }).click();
  const src = await page.locator('.library').getByRole('button', { name: 'Rangée 2 colonnes' }).boundingBox();
  const frame = await page.locator('iframe').boundingBox();
  if (src && frame) {
    await page.mouse.move(src.x + 10, src.y + 10);
    await page.mouse.down();
    await page.mouse.move(src.x + 40, src.y + 40, { steps: 4 });
    await page.mouse.move(frame.x + frame.width / 2, frame.y + frame.height - 40, { steps: 10 });
    await shot('4-glisser');
    await page.mouse.up();
  }
  const light = page.getByRole('button', { name: 'Thème clair' });
  if (await light.count()) {
    await page.keyboard.press('Escape');
    await row('Hero').click();
    await light.click();
    await shot('5-theme-clair');
  }
} finally {
  await browser.close();
  app.server.close();
  await rm(work, { recursive: true, force: true });
}
