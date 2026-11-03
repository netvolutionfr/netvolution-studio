// Builds the Studio's font catalog (ADR-0018): popular open-licensed fonts, Latin subset (French
// included), woff2, with their licence. Downloaded once from npm (Fontsource, pinned versions) and
// committed, so the Studio never calls a font service. Usage: npm run fonts:catalog
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const VERSION = '5.3.0';
/** Variable fonts (one file per style covers every weight), then two popular static ones. */
const VARIABLE = [
  'inter',
  'roboto',
  'open-sans',
  'montserrat',
  'raleway',
  'nunito',
  'work-sans',
  'dm-sans',
  'manrope',
  'figtree',
  'outfit',
  'plus-jakarta-sans',
  'jost',
  'noto-sans',
  'playfair-display',
  'merriweather',
  'lora',
  'source-serif-4',
  'fraunces',
  'noto-serif',
  'roboto-slab',
  'oswald',
  'space-grotesk',
];
const STATIC: Record<string, number[]> = { lato: [400, 700], poppins: [400, 500, 600, 700] };
const VERSIONS: Record<string, string> = { 'source-serif-4': '5.3.1' };

type Weight = { min: number; max: number };
export type CatalogFont = {
  id: string;
  family: string;
  category: string;
  license: string;
  files: { file: string; weight: Weight; style: 'normal' | 'italic' }[];
};

const out = import.meta.dirname;
const tmp = mkdtempSync(join(tmpdir(), 'ns-fonts-'));
const catalog: CatalogFont[] = [];

function fetchPackage(name: string) {
  const dir = join(tmp, name.replace(/[@/]/g, '_'));
  mkdirSync(dir);
  const tgz = execFileSync('npm', ['pack', '--silent', name], { cwd: dir, encoding: 'utf8' }).trim();
  execFileSync('tar', ['-xzf', tgz], { cwd: dir });
  return join(dir, 'package');
}

function add(id: string, pkg: string, files: CatalogFont['files'], sources: string[]) {
  const meta = JSON.parse(readFileSync(join(pkg, 'metadata.json'), 'utf8'));
  const licenseText = readFileSync(join(pkg, 'LICENSE'), 'utf8');
  const first =
    licenseText
      .split('\n')[0]
      ?.replace(/\s+\S+\.ttf:.*$/, '')
      .trim() ?? '';
  // The Apache licence text starts with its title, not with the copyright: name the font instead.
  const copyright = /^Apache License/.test(first) ? `${meta.family}, Google Fonts` : first;
  const name = /Apache/.test(licenseText) ? 'Apache License 2.0' : 'SIL Open Font License 1.1';
  files.forEach((f, i) => void cpSync(join(pkg, 'files', sources[i] as string), join(out, 'files', f.file)));
  writeFileSync(join(out, 'licenses', `${id}.txt`), licenseText);
  catalog.push({
    id,
    family: meta.family,
    category: meta.category,
    license: `${name} — ${copyright}`,
    files,
  });
}

mkdirSync(join(out, 'files'), { recursive: true });
mkdirSync(join(out, 'licenses'), { recursive: true });
try {
  for (const id of VARIABLE) {
    const pkg = fetchPackage(`@fontsource-variable/${id}@${VERSIONS[id] ?? VERSION}`);
    const meta = JSON.parse(readFileSync(join(pkg, 'metadata.json'), 'utf8'));
    const weight = { min: Number(meta.variable.wght.min), max: Number(meta.variable.wght.max) };
    const styles = (['normal', 'italic'] as const).filter((s) => meta.styles.includes(s));
    add(
      id,
      pkg,
      styles.map((style) => ({ file: `${id}-${style}.woff2`, weight, style })),
      styles.map((style) => `${id}-latin-wght-${style}.woff2`),
    );
  }
  for (const [id, weights] of Object.entries(STATIC)) {
    const pkg = fetchPackage(`@fontsource/${id}@${VERSION}`);
    const variants = [...weights.map((w) => [w, 'normal'] as const), [400, 'italic'] as const];
    add(
      id,
      pkg,
      variants.map(([w, style]) => ({
        file: `${id}-${w}-${style}.woff2`,
        weight: { min: w, max: w },
        style,
      })),
      variants.map(([w, style]) => `${id}-latin-${w}-${style}.woff2`),
    );
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
catalog.sort((a, b) => a.family.localeCompare(b.family));
writeFileSync(join(out, 'catalog.json'), `${JSON.stringify(catalog, null, 2)}\n`);
console.log(`${catalog.length} polices, ${catalog.reduce((n, f) => n + f.files.length, 0)} fichiers`);
