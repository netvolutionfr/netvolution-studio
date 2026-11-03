import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { registry } from '@ns/components/definitions';
import { loadSite } from '@ns/core';
import { exportProject } from './write.ts';

const [input, outDir] = process.argv.slice(2);
if (!input || !outDir) {
  console.error('Usage: npm run export -- <document.json> <dossier-de-sortie>');
  process.exit(2);
}
const result = loadSite(JSON.parse(await readFile(input, 'utf8')), registry);
if (!result.ok) {
  for (const d of result.diagnostics) console.error(`${d.code} ${d.path.join('.')}: ${d.message}`);
  process.exit(1);
}
// Media are read from media/ next to the document (fixtures/media, or a project folder).
const files = await exportProject(result.doc, registry, outDir, {
  mediaDirs: [join(dirname(input), 'media')],
});
console.log(
  `Projet Astro exporté dans ${outDir} (${files.length} fichiers). Ensuite : cd ${outDir} && npm ci && npm run build`,
);
