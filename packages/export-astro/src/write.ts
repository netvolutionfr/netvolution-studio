import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import {
  assetLinkTargets,
  backgroundAssets,
  customCssAssets,
  fieldAssets,
  pageRoots,
  type Registry,
  type Site,
  subtree,
} from '@ns/core';
import { type Files, generatePageFiles, readme, siteFiles, withNotFound } from './generate.ts';

const templateDir = join(import.meta.dirname, '../template');
const componentsDir = join(import.meta.dirname, '../../components/src');
const SKIP = new Set(['node_modules', 'dist', '.astro']);

export async function templateFiles(): Promise<Files> {
  const files: Files = {};
  const walk = async (dir: string) => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if (SKIP.has(entry.name)) continue;
      const path = join(dir, entry.name);
      if (entry.isDirectory()) await walk(path);
      // `_gitignore`: npm would drop a real .gitignore when packing.
      else
        files[relative(templateDir, path).replace(/^_gitignore$/, '.gitignore')] = await readFile(
          path,
          'utf8',
        );
    }
  };
  await walk(templateDir);
  return files;
}

/** Nodes rendered by the published pages: only their components and media are exported. */
const exportedNodes = (site: Site) =>
  site.pages
    .filter((p) => p.publish)
    .flatMap((p) => pageRoots(site, p.id).flatMap((r) => subtree(site, r)))
    .map((id) => site.nodes[id])
    .filter((n) => n !== undefined);

/** Sources of the components used: `readView(type)` returns the view, `readView(type, 'island.ts')` its island. */
export async function readViews(
  doc: Site,
): Promise<(type: string, file?: 'view.tsx' | 'island.ts') => string> {
  const sources = new Map<string, string>();
  for (const type of new Set(exportedNodes(withNotFound(doc)).map((n) => n.type))) {
    if (!/^[a-z][a-z0-9-]*$/.test(type)) throw new Error(`Invalid type: ${type}`);
    sources.set(`${type}/view.tsx`, await readFile(join(componentsDir, type, 'view.tsx'), 'utf8'));
    const island = await readFile(join(componentsDir, type, 'island.ts'), 'utf8').catch(() => null);
    if (island !== null) sources.set(`${type}/island.ts`, island);
  }
  if (
    exportedNodes(doc).some((n) => n.animations?.some((x) => x.trigger !== 'hover' && x.trigger !== 'focus'))
  ) {
    sources.set(
      'animations/island.ts',
      await readFile(join(componentsDir, 'animations', 'island.ts'), 'utf8'),
    );
  }
  return (type, file = 'view.tsx') => sources.get(`${type}/${file}`) ?? '';
}

/** Writes files under `root`, refusing any path that would escape it. */
export async function writeFiles(root: string, files: Files) {
  const base = resolve(root);
  for (const [path, content] of Object.entries(files)) {
    const target = resolve(base, path);
    if (!target.startsWith(base + sep)) throw new Error(`Refused path outside export: ${path}`);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, content);
  }
}

/**
 * Media files used by the published pages, read from the first of `mediaDirs` that has them.
 * Raster images placed by components go to `src/media/` (optimized at build, ADR-0010); SVGs,
 * downloadable files and linked media to `public/media/`, at the same path as in the canvas.
 */
export async function mediaFiles(
  doc: Site,
  registry: Registry,
  mediaDirs: readonly string[],
): Promise<Files> {
  const placed = new Set<string>();
  // Linked media and sharing images are served as is from public/media/.
  const linked = new Set<string>([
    ...assetLinkTargets(doc.menus ?? []),
    ...doc.pages.flatMap((p) => (p.publish && p.seo?.image ? [p.seo.image] : [])),
  ]);
  for (const node of exportedNodes(doc)) {
    for (const id of assetLinkTargets(node.props)) linked.add(id);
    // Background images are referenced by the stylesheets, served as is (ADR-0017).
    for (const id of backgroundAssets(node.style)) linked.add(id);
    for (const ref of fieldAssets(registry.get(node.type), node.props))
      if (doc.assets[ref.id]) placed.add(ref.id);
  }
  const read = async (file: string) => {
    for (const dir of mediaDirs) {
      const content = await readFile(join(dir, file)).catch(() => undefined);
      if (content) return content;
    }
    throw new Error(`Media file not found: ${file}`);
  };
  // Images of the project stylesheet (ADR-0023), served as is like background images.
  for (const id of customCssAssets(doc.customCss)) linked.add(id);
  // Imported fonts are all declared by the stylesheets (ADR-0018).
  for (const asset of Object.values(doc.assets)) if (asset.kind === 'font') linked.add(asset.id);
  const files: Files = {};
  for (const id of new Set([...placed, ...linked])) {
    const asset = doc.assets[id];
    if (!asset) continue;
    const content = await read(asset.file);
    if (placed.has(id) && asset.kind === 'image') files[`src/media/${asset.file}`] = content;
    if (linked.has(id) || asset.kind !== 'image') files[`public/media/${asset.file}`] = content;
  }
  return files;
}

/** Full standalone Astro project for a validated site. `outDir` must be absent or empty. */
export async function exportProject(
  doc: Site,
  registry: Registry,
  outDir: string,
  options: { mediaDirs?: readonly string[] } = {},
) {
  const existing = await readdir(outDir).catch(() => []);
  if (existing.length) throw new Error(`Export directory is not empty: ${outDir}`);
  const files = {
    ...(await templateFiles()),
    ...generatePageFiles(doc, registry, await readViews(doc)),
    ...(await mediaFiles(doc, registry, options.mediaDirs ?? [])),
    ...siteFiles(doc),
    'README.md': readme(doc),
  };
  await writeFiles(outDir, files);
  return Object.keys(files).sort();
}
