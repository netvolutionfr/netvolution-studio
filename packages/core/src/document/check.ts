import { assetReferences, instanceStatus } from '../editor/commands.ts';
import type { Registry } from '../registry/registry.ts';
import { pageRoots } from '../style/css.ts';
import { backgroundAssets } from '../style/schema.ts';
import { assetLinkTargets, type Link, pageLinkTargets, pagePath } from './links.ts';
import { type Diagnostic, loadSite } from './load.ts';
import { nodeAtPath, type Site, subtree } from './schema.ts';

/** A pre-export check (SB-11): errors block the export, warnings are shown. */
export type Check = Omit<Diagnostic, 'code'> & {
  code: string;
  severity: 'error' | 'warning';
  pageId?: string;
};

/**
 * Checks before export: model validation, broken internal links, missing media files (when
 * `presentFiles` lists the media folder), duplicate slugs (validation), essential metadata and
 * automatable accessibility rules (headings). Pure; the build itself is checked by running it.
 */
export function checkSite(
  input: unknown,
  registry: Registry,
  /** Files of the media folder; with their size in bytes, heavy background images are reported. */
  presentFiles?: ReadonlySet<string> | ReadonlyMap<string, number>,
): { site: Site | null; checks: Check[] } {
  const loaded = loadSite(input, registry);
  if (!loaded.ok) return { site: null, checks: loaded.diagnostics.map((d) => ({ ...d, severity: 'error' })) };
  const site = loaded.doc;
  const checks: Check[] = [];
  const error = (code: string, message: string, path: Check['path'], pageId?: string) =>
    checks.push({ code, message, path, severity: 'error', ...(pageId && { pageId }) });
  const warn = (code: string, message: string, path: Check['path'], pageId?: string) =>
    checks.push({ code, message, path, severity: 'warning', ...(pageId && { pageId }) });

  const published = site.pages.filter((p) => p.publish);
  const unpublished = new Map(site.pages.filter((p) => !p.publish).map((p) => [p.id, p]));
  if (unpublished.has(site.settings.homePageId))
    error('home-unpublished', "La page d'accueil n'est pas publiée", ['pages']);
  if (!site.settings.siteUrl)
    warn(
      'no-site-url',
      'URL canonique du site absente : ni sitemap ni URL absolues (canonical, Open Graph)',
      ['settings'],
    );

  // Links in the exported content: to an unpublished page (404 once exported) or still a placeholder.
  const checkLinks = (value: unknown, where: string, path: Check['path'], pageId?: string) => {
    for (const target of pageLinkTargets(value)) {
      const page = unpublished.get(target);
      if (page)
        error(
          'broken-link',
          `${where} : lien vers « ${page.title} », page non publiée (absente de l'export)`,
          path,
          pageId,
        );
    }
    for (const href of placeholderLinks(value))
      warn('empty-link', `${where} : lien non renseigné (${href})`, path, pageId);
  };
  const exportedRoots = new Set<string>();
  for (const page of published) {
    const nodes = pageRoots(site, page.id).flatMap((r) => subtree(site, r));
    for (const id of nodes) exportedRoots.add(id);
    const label = `Page « ${page.title || pagePath(page.slug)} »`;
    if (!page.title.trim() && !page.seo?.title)
      warn('no-title', `${label} : titre manquant`, ['pages'], page.id);
    if (!page.seo?.description)
      warn('no-description', `${label} : meta description manquante`, ['pages'], page.id);
    if ((page.seo?.title ?? '').length > 60)
      warn('long-title', `${label} : titre SEO de plus de 60 caractères`, ['pages'], page.id);
    if ((page.seo?.description ?? '').length > 160)
      warn('long-description', `${label} : meta description de plus de 160 caractères`, ['pages'], page.id);
    // Headings: one h1, no skipped level (automatable accessibility rule).
    const levels = nodes.flatMap((id) => {
      const n = site.nodes[id];
      return n?.type === 'heading' ? [Number(n.props.level)] : [];
    });
    const h1 = levels.filter((l) => l === 1).length;
    if (h1 !== 1)
      warn('h1-count', `${label} : ${h1} titre(s) de niveau 1 (un seul attendu)`, ['pages'], page.id);
    levels.forEach((level, i) => {
      const previous = levels[i - 1];
      if (previous !== undefined && level > previous + 1)
        warn(
          'heading-skip',
          `${label} : titre de niveau ${level} après un niveau ${previous}`,
          ['pages'],
          page.id,
        );
    });
  }
  for (const id of exportedRoots) {
    const node = site.nodes[id];
    if (node) checkLinks(node.props, `Élément ${node.name ?? node.type}`, ['nodes', id]);
  }
  for (const [i, m] of (site.menus ?? []).entries()) checkLinks(m.items, `Menu « ${m.name} »`, ['menus', i]);
  for (const [i, r] of (site.redirects ?? []).entries())
    checkLinks(r.to, `Redirection ${r.from}`, ['redirects', i]);

  for (const sym of site.symbols ?? []) {
    for (const param of sym.params) {
      const target = nodeAtPath(site, sym.rootId, param.path);
      if (!target || !registry.get(target.type)?.fields.some((f) => f.prop === param.prop))
        warn('symbol-param', `Composant « ${sym.name} » : paramètre « ${param.label} » sans élément cible`, [
          'symbols',
          sym.id,
        ]);
    }
  }
  // Advanced composition (CS-04): an absolute element is positioned against its parent, which must be
  // positioned itself (otherwise it escapes to the page and breaks on other screen sizes).
  for (const id of exportedRoots) {
    const node = site.nodes[id];
    const absolute = node && Object.values(node.style).some((d) => d.position === 'absolute');
    if (!node || !absolute) continue;
    const parent = Object.values(site.nodes).find((n) => n.children.includes(id));
    const positioned =
      parent &&
      Object.values(parent.style).some((d) => d.position === 'relative' || d.position === 'absolute');
    if (!positioned)
      warn(
        'absolute-unanchored',
        `Élément ${node.name ?? node.type} : position absolue sans parent positionné (relative)`,
        ['nodes', id],
      );
  }

  // Shared components (ADR-0011): instances behind their definition, or edited outside their parameters.
  for (const node of Object.values(site.nodes)) {
    const status = node.instance && instanceStatus(site, node.id, registry);
    if (!status) continue;
    const name = `Instance « ${node.name ?? status.symbol.name} »`;
    if (status.outdated)
      warn(
        'instance-outdated',
        `${name} : version ${node.instance?.version} du composant, version ${status.symbol.version} disponible`,
        ['nodes', node.id],
      );
    if (status.modified)
      warn(
        'instance-modified',
        `${name} : modifiée hors de ses paramètres (écrasé à la prochaine mise à jour)`,
        ['nodes', node.id],
      );
    if (status.rejected.length)
      warn('instance-incompatible', `${name} : valeurs incompatibles (${status.rejected.join(', ')})`, [
        'nodes',
        node.id,
      ]);
  }

  if (presentFiles) {
    for (const asset of Object.values(site.assets)) {
      if (presentFiles.has(asset.file)) continue;
      const used =
        asset.kind === 'font' ||
        assetReferences(site, registry, asset.id).length > 0 ||
        site.pages.some((p) => p.seo?.image === asset.id) ||
        assetLinkTargets(site.redirects ?? []).includes(asset.id);
      (used ? error : warn)('missing-file', `Fichier du média « ${asset.name ?? asset.file} » introuvable`, [
        'assets',
        asset.id,
      ]);
    }
  }
  // Background images are copied without optimization (ADR-0017): above 500 KB, a warning.
  if (presentFiles instanceof Map) {
    const backgrounds = new Set(Object.values(site.nodes).flatMap((n) => backgroundAssets(n.style)));
    for (const id of backgrounds) {
      const asset = site.assets[id];
      const size = asset && presentFiles.get(asset.file);
      if (asset && size !== undefined && size > HEAVY_BACKGROUND)
        warn(
          'heavy-background',
          `Image de fond « ${asset.name ?? asset.file} » : ${(size / 1024 / 1024).toFixed(1)} Mo, non optimisée à l'export (réduisez-la sous 500 Ko)`,
          ['assets', id],
        );
    }
  }
  return { site, checks };
}

const HEAVY_BACKGROUND = 500 * 1024;

/** URL links left at a placeholder ('#' or empty anchor). */
function placeholderLinks(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(placeholderLinks);
  if (typeof value !== 'object' || value === null) return [];
  const o = value as Partial<Link> & Record<string, unknown>;
  if (o.kind === 'url' && (o as { href?: string }).href === '#') return ['#'];
  return Object.values(o).flatMap(placeholderLinks);
}
