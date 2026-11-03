// Builds the built-in site templates written in code (templates/*.ts) into templates/<id>.json,
// validated by the Studio's model and pre-export checks, in French and in each language of
// templates/translations/ (ADR-0024). Usage: npm run templates:build
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { agenceCreative } from './agence-creative.ts';
import { cabinetConseil } from './cabinet-conseil.ts';
import { buildTemplate, translateSpec } from './kit.ts';

const dir = import.meta.dirname;
const dictionary = (id: string, lang: string) =>
  JSON.parse(readFileSync(join(dir, 'translations', `${id}.${lang}.json`), 'utf8')) as Record<string, string>;

for (const source of [agenceCreative, cabinetConseil]) {
  for (const spec of [source, translateSpec(source, 'en', dictionary(source.id, 'en'))]) {
    const { archive, warnings } = buildTemplate(spec);
    writeFileSync(join(dir, `${spec.id}.json`), `${JSON.stringify(archive)}\n`);
    console.log(`${spec.id}: ${spec.pages.length} pages, ${Object.keys(archive.site.nodes).length} elements`);
    for (const w of warnings) console.log(`  warning: ${w}`);
  }
}
