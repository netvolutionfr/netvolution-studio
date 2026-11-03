import { fieldAssets, type Registry } from '../registry/registry.ts';
import { checkCustomCss } from '../style/custom.ts';
import { backgroundAssets, STYLE_GROUPS, type StyleProperty } from '../style/schema.ts';
import { EMPTY_TOKENS, tokenRefs } from '../style/tokens.ts';
import { assetLinkTargets, pageLinkTargets, pagePath } from './links.ts';
import { migrate, OLDEST_VERSION } from './migrate.ts';
import { isPicture, SCHEMA_VERSION, type Site, siteSchema, subtree } from './schema.ts';

export type DiagnosticCode =
  | 'invalid-document'
  | 'unsupported-version'
  | 'schema'
  | 'node-id-mismatch'
  | 'duplicate-breakpoint'
  | 'missing-root'
  | 'missing-node'
  | 'cycle'
  | 'multiple-parents'
  | 'orphan-node'
  | 'unknown-component'
  | 'child-not-allowed'
  | 'invalid-props'
  | 'unknown-breakpoint'
  | 'missing-asset'
  | 'style-not-allowed'
  | 'duplicate-page'
  | 'duplicate-slug'
  | 'invalid-slug'
  | 'missing-page'
  | 'missing-token'
  | 'duplicate-id'
  | 'missing-layout'
  | 'missing-menu'
  | 'invalid-css';

export type Diagnostic = {
  code: DiagnosticCode;
  message: string;
  path: (string | number)[];
  nodeId?: string;
};

export type LoadResult = { ok: true; doc: Site } | { ok: false; diagnostics: Diagnostic[] };

/** The single entry point for untrusted documents: version, migrations, schema, then semantics. */
export function loadSite(input: unknown, registry: Registry): LoadResult {
  const version = (input as { schemaVersion?: unknown } | null)?.schemaVersion;
  if (typeof input !== 'object' || input === null || typeof version !== 'number') {
    return fail('invalid-document', 'Document JSON attendu avec un schemaVersion numérique', [
      'schemaVersion',
    ]);
  }
  if (!Number.isInteger(version) || version < OLDEST_VERSION || version > SCHEMA_VERSION) {
    return fail(
      'unsupported-version',
      `schemaVersion ${version} non pris en charge (attendu ${OLDEST_VERSION} à ${SCHEMA_VERSION})`,
      ['schemaVersion'],
    );
  }
  const parsed = siteSchema.safeParse(migrate(input as Record<string, unknown>));
  if (!parsed.success) {
    return {
      ok: false,
      diagnostics: parsed.error.issues.map((i) => ({
        code: 'schema',
        message: i.message,
        path: i.path.map((p) => (typeof p === 'symbol' ? String(p) : p)),
      })),
    };
  }
  const diagnostics = validateSemantics(parsed.data, registry);
  return diagnostics.length ? { ok: false, diagnostics } : { ok: true, doc: parsed.data };
}

export const serializeSite = (doc: Site) => `${JSON.stringify(doc, null, 2)}\n`;

/** Slug segments that would collide with generated files or routes of the export. */
const RESERVED_FIRST = new Set(['404', 'media']);

function fail(code: DiagnosticCode, message: string, path: Diagnostic['path']): LoadResult {
  return { ok: false, diagnostics: [{ code, message, path }] };
}

function validateSemantics(doc: Site, registry: Registry): Diagnostic[] {
  const out: Diagnostic[] = [];
  const add = (code: DiagnosticCode, message: string, path: Diagnostic['path'], nodeId?: string) =>
    out.push(nodeId ? { code, message, path, nodeId } : { code, message, path });

  const bpIds = new Set<string>();
  const widths = new Set<number>();
  doc.breakpoints.forEach((bp, i) => {
    if (bpIds.has(bp.id) || widths.has(bp.maxWidth)) {
      add('duplicate-breakpoint', `Breakpoint dupliqué : ${bp.id} (${bp.maxWidth}px)`, ['breakpoints', i]);
    }
    bpIds.add(bp.id);
    widths.add(bp.maxWidth);
  });

  const pageIds = new Set<string>();
  const slugs = new Set<string>();
  doc.pages.forEach((page, i) => {
    const path = ['pages', i];
    if (pageIds.has(page.id)) add('duplicate-page', `Page dupliquée : ${page.id}`, [...path, 'id']);
    pageIds.add(page.id);
    if (slugs.has(page.slug)) add('duplicate-slug', `Adresse dupliquée : /${page.slug}`, [...path, 'slug']);
    slugs.add(page.slug);
    const home = page.id === doc.settings.homePageId;
    const segments = page.slug.split('/');
    if (home !== (page.slug === '')) {
      add(
        'invalid-slug',
        home ? "La page d'accueil a une adresse vide" : 'Adresse vide réservée à la page d’accueil',
        [...path, 'slug'],
      );
    } else if (RESERVED_FIRST.has(segments[0] as string) || segments.includes('index')) {
      add('invalid-slug', `Adresse réservée : /${page.slug}`, [...path, 'slug']);
    }
  });
  if (!pageIds.has(doc.settings.homePageId)) {
    add('missing-page', `Page d'accueil inexistante : ${doc.settings.homePageId}`, [
      'settings',
      'homePageId',
    ]);
  }

  const tokens = doc.tokens ?? EMPTY_TOKENS;
  const checkRefs = (decls: Record<string, unknown>, path: Diagnostic['path'], nodeId?: string) => {
    for (const ref of tokenRefs(decls)) {
      if (!tokens[ref.kind][ref.id])
        add('missing-token', `Token introuvable : ${ref.id}`, [...path, ref.prop], nodeId);
    }
  };
  const checkBreakpoints = (keys: string[], path: Diagnostic['path']) => {
    for (const bp of keys) {
      if (bp !== 'base' && !bpIds.has(bp))
        add('unknown-breakpoint', `Breakpoint inconnu : ${bp}`, [...path, bp]);
    }
  };
  for (const [id, size] of Object.entries(tokens.sizes))
    checkBreakpoints(Object.keys(size.value), ['tokens', 'sizes', id, 'value']);
  for (const [id, text] of Object.entries(tokens.textStyles)) {
    checkBreakpoints(Object.keys(text.style), ['tokens', 'textStyles', id, 'style']);
    for (const [bp, decls] of Object.entries(text.style))
      checkRefs(decls, ['tokens', 'textStyles', id, 'style', bp]);
  }

  // Layouts and shared components share the page id space (the editor opens any of them).
  const layoutRoles = new Map<string, string>();
  (doc.layouts ?? []).forEach((l, i) => {
    if (pageIds.has(l.id) || layoutRoles.has(l.id))
      add('duplicate-id', `Identifiant de layout déjà utilisé : ${l.id}`, ['layouts', i, 'id']);
    layoutRoles.set(l.id, l.role);
  });
  const symbols = new Map((doc.symbols ?? []).map((sym) => [sym.id, sym]));
  (doc.symbols ?? []).forEach((sym, i) => {
    if (
      pageIds.has(sym.id) ||
      layoutRoles.has(sym.id) ||
      (doc.symbols ?? []).findIndex((x) => x.id === sym.id) !== i
    )
      add('duplicate-id', `Identifiant de composant déjà utilisé : ${sym.id}`, ['symbols', i, 'id']);
    // A parameter whose target changed is a warning of checkSite: editing a definition stays possible.
  });
  // Instances: existing definition, known version, and no definition containing itself (ADR-0011).
  const uses = new Map<string, Set<string>>();
  for (const sym of doc.symbols ?? []) {
    uses.set(
      sym.id,
      new Set(subtree(doc, sym.rootId).flatMap((id) => doc.nodes[id]?.instance?.symbolId ?? [])),
    );
  }
  for (const [key, node] of Object.entries(doc.nodes)) {
    const ref = node.instance;
    if (!ref) continue;
    const sym = symbols.get(ref.symbolId);
    if (!sym)
      add('missing-node', `Composant partagé introuvable : ${ref.symbolId}`, ['nodes', key, 'instance'], key);
    else if (ref.version > sym.version)
      add(
        'invalid-props',
        `Version ${ref.version} inconnue du composant ${sym.name}`,
        ['nodes', key, 'instance'],
        key,
      );
  }
  /** Whether component `from` contains `target`, directly or through nested instances. */
  const reaches = (from: string, target: string, seen = new Set<string>()): boolean => {
    if (from === target) return true;
    if (seen.has(from)) return false;
    seen.add(from);
    return [...(uses.get(from) ?? [])].some((u) => reaches(u, target, seen));
  };
  (doc.symbols ?? []).forEach((sym, i) => {
    if ([...(uses.get(sym.id) ?? [])].some((u) => reaches(u, sym.id)))
      add('cycle', `Le composant ${sym.name} se contient lui-même`, ['symbols', i]);
  });

  const checkChoice = (choice: Site['settings']['defaultLayouts'], path: Diagnostic['path']) => {
    for (const role of ['header', 'footer'] as const) {
      const id = choice?.[role];
      if (id && layoutRoles.get(id) !== role)
        add('missing-layout', `${role === 'header' ? 'Header' : 'Footer'} introuvable : ${id}`, [
          ...path,
          role,
        ]);
    }
  };
  checkChoice(doc.settings.defaultLayouts, ['settings', 'defaultLayouts']);
  doc.pages.forEach((p, i) => {
    checkChoice(p.layouts, ['pages', i, 'layouts']);
  });

  const menuIds = new Set<string>();
  (doc.menus ?? []).forEach((menu, i) => {
    if (menuIds.has(menu.id)) add('duplicate-id', `Menu dupliqué : ${menu.id}`, ['menus', i, 'id']);
    menuIds.add(menu.id);
    const itemIds = menu.items.flatMap((item) => [item.id, ...(item.children ?? []).map((c) => c.id)]);
    if (new Set(itemIds).size !== itemIds.length)
      add('duplicate-id', `Entrées dupliquées dans le menu ${menu.id}`, ['menus', i, 'items']);
    for (const assetId of assetLinkTargets(menu.items)) {
      if (!doc.assets[assetId])
        add('missing-asset', `Lien vers un média inexistant : ${assetId}`, ['menus', i, 'items']);
    }
    for (const pageId of pageLinkTargets(menu.items)) {
      if (!pageIds.has(pageId))
        add('missing-page', `Lien vers une page inexistante : ${pageId}`, ['menus', i, 'items']);
    }
  });

  doc.pages.forEach((p, i) => {
    const image = p.seo?.image;
    if (image && !isPicture(doc.assets[image]))
      add('missing-asset', `Image de partage introuvable : ${image}`, ['pages', i, 'seo', 'image']);
  });
  const paths = new Set(doc.pages.map((p) => pagePath(p.slug)));
  const froms = new Set<string>();
  (doc.redirects ?? []).forEach((r, i) => {
    const from = r.from.endsWith('/') ? r.from : `${r.from}/`;
    if (froms.has(from)) add('duplicate-id', `Redirection dupliquée : ${r.from}`, ['redirects', i, 'from']);
    froms.add(from);
    if (paths.has(from)) add('invalid-slug', `${r.from} est l'adresse d'une page`, ['redirects', i, 'from']);
    for (const target of pageLinkTargets(r.to))
      if (!pageIds.has(target))
        add('missing-page', `Redirection vers une page inexistante : ${target}`, ['redirects', i, 'to']);
    for (const target of assetLinkTargets(r.to))
      if (!doc.assets[target])
        add('missing-asset', `Redirection vers un média inexistant : ${target}`, ['redirects', i, 'to']);
  });

  if (doc.customCss) {
    const css = checkCustomCss(doc.customCss);
    if (!css.ok)
      for (const e of css.errors)
        add('invalid-css', `CSS du projet, ligne ${e.line} : ${e.message}`, ['customCss']);
    else
      for (const id of css.assets)
        if (!isPicture(doc.assets[id]))
          add('missing-asset', `CSS du projet : image introuvable (${id})`, ['customCss']);
  }

  for (const [key, asset] of Object.entries(doc.assets)) {
    if (asset.id !== key)
      add('node-id-mismatch', `La clé ${key} ne correspond pas à l'id ${asset.id}`, ['assets', key]);
  }

  for (const [key, node] of Object.entries(doc.nodes)) {
    const path = ['nodes', key];
    if (node.id !== key)
      add('node-id-mismatch', `La clé ${key} ne correspond pas à l'id ${node.id}`, path, key);
    const def = registry.get(node.type);
    if (!def) {
      add('unknown-component', `Type de composant inconnu : ${node.type}`, [...path, 'type'], key);
      continue;
    }
    const props = def.props.safeParse(node.props);
    if (!props.success) {
      for (const i of props.error.issues) {
        add('invalid-props', i.message, [...path, 'props', ...i.path.map(String)], key);
      }
    }
    for (const ref of fieldAssets(def, node.props)) {
      const asset = doc.assets[ref.id];
      if (!asset) add('missing-asset', `Média introuvable : ${ref.id}`, [...path, 'props', ref.prop], key);
      else if (!ref.accept.includes(asset.kind))
        add('missing-asset', `Type de média non accepté : ${asset.kind}`, [...path, 'props', ref.prop], key);
    }
    for (const f of def.fields) {
      const ref = node.props[f.prop];
      if (
        f.kind === 'menu' &&
        ref !== null &&
        ref !== undefined &&
        !(typeof ref === 'string' && menuIds.has(ref))
      ) {
        add('missing-menu', `Menu introuvable : ${String(ref)}`, [...path, 'props', f.prop], key);
      }
    }
    for (const assetId of assetLinkTargets(node.props)) {
      if (!doc.assets[assetId])
        add('missing-asset', `Lien vers un média inexistant : ${assetId}`, [...path, 'props'], key);
    }
    for (const pageId of pageLinkTargets(node.props)) {
      if (!pageIds.has(pageId))
        add('missing-page', `Lien vers une page inexistante : ${pageId}`, [...path, 'props'], key);
    }
    const allowed = new Set<string>(
      def.styleGroups.flatMap((g) => STYLE_GROUPS[g] as readonly StyleProperty[]),
    );
    for (const assetId of backgroundAssets(node.style)) {
      if (!isPicture(doc.assets[assetId]))
        add('missing-asset', `Image de fond introuvable : ${assetId}`, [...path, 'style'], key);
    }
    for (const [bp, decls] of Object.entries(node.style)) {
      if (bp !== 'base' && !bpIds.has(bp))
        add('unknown-breakpoint', `Breakpoint inconnu : ${bp}`, [...path, 'style', bp], key);
      checkRefs(decls, [...path, 'style', bp], key);
      for (const prop of Object.keys(decls)) {
        if (!allowed.has(prop)) {
          add(
            'style-not-allowed',
            `${prop} non autorisé pour ${node.type}`,
            [...path, 'style', bp, prop],
            key,
          );
        }
      }
    }
    node.children.forEach((childId, i) => {
      const child = doc.nodes[childId];
      if (!child) add('missing-node', `Enfant inexistant : ${childId}`, [...path, 'children', i], key);
      else if (registry.get(child.type) && !registry.canContain(node.type, child.type)) {
        add(
          'child-not-allowed',
          `${child.type} n'est pas autorisé dans ${node.type}`,
          [...path, 'children', i],
          key,
        );
      }
    });
  }

  // Walk from every page root: each node must be reached exactly once.
  const roots = new Set<string>();
  const parents = new Map<string, string>();
  const onPath = new Set<string>();
  const walk = (id: string) => {
    onPath.add(id);
    for (const childId of doc.nodes[id]?.children ?? []) {
      if (onPath.has(childId)) {
        add('cycle', `Cycle détecté : ${id} → ${childId}`, ['nodes', id, 'children'], id);
      } else if (parents.has(childId) || roots.has(childId)) {
        add('multiple-parents', `${childId} a plusieurs parents`, ['nodes', id, 'children'], childId);
      } else if (doc.nodes[childId]) {
        parents.set(childId, id);
        walk(childId);
      }
    }
    onPath.delete(id);
  };
  const rooted: [string, { rootId: string }[]][] = [
    ['pages', doc.pages],
    ['layouts', doc.layouts ?? []],
    ['symbols', doc.symbols ?? []],
  ];
  for (const [list, owners] of rooted) {
    owners.forEach(({ rootId }, i) => {
      if (!doc.nodes[rootId]) {
        add('missing-root', `Racine inexistante : ${rootId}`, [list, i, 'rootId']);
      } else if (roots.has(rootId) || parents.has(rootId)) {
        add('multiple-parents', `${rootId} a plusieurs parents`, [list, i, 'rootId'], rootId);
      } else {
        roots.add(rootId);
        walk(rootId);
      }
    });
  }
  for (const id of Object.keys(doc.nodes)) {
    if (!roots.has(id) && !parents.has(id))
      add(
        'orphan-node',
        `Nœud non rattaché à une page, un layout ou un composant : ${id}`,
        ['nodes', id],
        id,
      );
  }
  return out;
}
