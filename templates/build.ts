// Builds the built-in site templates written in code (templates/*.ts) into templates/<id>.json,
// validated by the Studio's model and pre-export checks. Usage: npm run templates:build
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { agenceCreative } from './agence-creative.ts';
import { cabinetConseil } from './cabinet-conseil.ts';
import { buildTemplate } from './kit.ts';

for (const spec of [agenceCreative, cabinetConseil]) {
  const { archive, warnings } = buildTemplate(spec);
  writeFileSync(join(import.meta.dirname, `${spec.id}.json`), `${JSON.stringify(archive)}\n`);
  console.log(`${spec.id} : ${spec.pages.length} pages, ${Object.keys(archive.site.nodes).length} éléments`);
  for (const w of warnings) console.log(`  avertissement : ${w}`);
}
