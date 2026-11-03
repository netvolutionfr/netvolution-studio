import { loadSite } from '../document/load.ts';
import type { DocNode, Site } from '../document/schema.ts';
import { type CommandContext, type CommandError, type CommandName, commands } from '../editor/commands.ts';
import { PERMISSIONS, type Permission, permissionOf } from './catalog.ts';

/** One call of a batch: a command name and its parameters, as given by a user, the AI or an automation. */
export type Call = { name: string; params: unknown };

export type NodeRef = { id: string; type: string; name?: string | undefined };
export type ValueChange = { key: string; before: unknown; after: unknown };
export type NodeChange = NodeRef & {
  props: ValueChange[];
  style: (ValueChange & { breakpoint: string })[];
  /** Other changed fields: children order, animations, instance link, parent. */
  other: string[];
};
export type SiteDiff = {
  added: NodeRef[];
  removed: NodeRef[];
  changed: NodeChange[];
  /** Site-level fields (pages, settings, tokens, menus, symbols…), compared as a whole. */
  site: ValueChange[];
  empty: boolean;
};

export type BatchResult =
  | {
      ok: true;
      site: Site;
      results: { name: string; created?: string[] | undefined; notice?: string | undefined }[];
      diff: SiteDiff;
    }
  | { ok: false; index: number; error: CommandError };

const ALL = new Set<Permission>(PERMISSIONS);
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const ref = (n: DocNode): NodeRef => ({ id: n.id, type: n.type, ...(n.name ? { name: n.name } : {}) });

/**
 * Applies a batch of calls to a copy of the site (CS-10, ADR-0013): each call is checked (known command,
 * permission, parameters), applied, then the whole site is validated. The batch is atomic: the first
 * failure refuses all of it, the site given is never modified.
 */
export function runBatch(
  site: Site,
  calls: readonly Call[],
  ctx: CommandContext,
  permissions: ReadonlySet<Permission> = ALL,
): BatchResult {
  let doc = site;
  const results: Extract<BatchResult, { ok: true }>['results'] = [];
  for (const [index, call] of calls.entries()) {
    const fail = (code: CommandError['code'], message: string): BatchResult => ({
      ok: false,
      index,
      error: { code, message: `Opération ${index + 1} (${call.name}) : ${message}` },
    });
    if (!Object.hasOwn(commands, call.name)) return fail('invalid', 'commande inconnue');
    const name = call.name as CommandName;
    if (!permissions.has(permissionOf(name)))
      return fail('not-allowed', `autorisation « ${permissionOf(name)} » requise`);
    const command = commands[name];
    const parsed = command.params.safeParse(call.params);
    if (!parsed.success) return fail('invalid', parsed.error.issues.map((i) => i.message).join('; '));
    const result = (
      command.apply as (d: Site, p: unknown, c: CommandContext) => ReturnType<typeof command.apply>
    )(doc, parsed.data, ctx);
    if (!result.ok) return fail(result.error.code, result.error.message);
    const check = loadSite(result.doc, ctx.registry);
    if (!check.ok) return fail('invalid', check.diagnostics.map((d) => d.message).join('; '));
    doc = result.doc;
    results.push({ name, created: result.created, notice: result.notice });
  }
  return { ok: true, site: doc, results, diff: diffSites(site, doc) };
}

/** Readable difference between two versions of a site: nodes added, removed, changed; site-level fields. */
export function diffSites(before: Site, after: Site): SiteDiff {
  const parents = (site: Site) => {
    const map = new Map<string, string>();
    for (const n of Object.values(site.nodes)) for (const c of n.children) map.set(c, n.id);
    return map;
  };
  const [parentsBefore, parentsAfter] = [parents(before), parents(after)];
  const added = Object.values(after.nodes)
    .filter((n) => !before.nodes[n.id])
    .map(ref);
  const removed = Object.values(before.nodes)
    .filter((n) => !after.nodes[n.id])
    .map(ref);
  const changed: NodeChange[] = [];
  for (const node of Object.values(after.nodes)) {
    const old = before.nodes[node.id];
    if (!old || same(old, node)) continue;
    const props = [...new Set([...Object.keys(old.props), ...Object.keys(node.props)])]
      .filter((key) => !same(old.props[key], node.props[key]))
      .map((key) => ({ key, before: old.props[key], after: node.props[key] }));
    const style = [...new Set([...Object.keys(old.style), ...Object.keys(node.style)])].flatMap(
      (breakpoint) => {
        const a = (old.style[breakpoint] ?? {}) as Record<string, unknown>;
        const b = (node.style[breakpoint] ?? {}) as Record<string, unknown>;
        return [...new Set([...Object.keys(a), ...Object.keys(b)])]
          .filter((key) => !same(a[key], b[key]))
          .map((key) => ({ breakpoint, key, before: a[key], after: b[key] }));
      },
    );
    const other = [
      ...(same(old.children, node.children) ? [] : ['children']),
      ...(same(old.animations, node.animations) ? [] : ['animations']),
      ...(same(old.instance, node.instance) ? [] : ['instance']),
      ...(old.name === node.name ? [] : ['name']),
      ...(parentsBefore.get(node.id) === parentsAfter.get(node.id) ? [] : ['parent']),
    ];
    changed.push({ ...ref(node), props, style, other });
  }
  const keys = new Set([...Object.keys(before), ...Object.keys(after)].filter((k) => k !== 'nodes'));
  const site = [...keys]
    .filter((key) => !same(before[key as keyof Site], after[key as keyof Site]))
    .map((key) => ({ key, before: before[key as keyof Site], after: after[key as keyof Site] }));
  return {
    added,
    removed,
    changed,
    site,
    empty: !added.length && !removed.length && !changed.length && !site.length,
  };
}

const SITE_LABELS: Record<string, string> = {
  pages: 'pages',
  settings: 'réglages du site',
  tokens: 'design system',
  menus: 'menus',
  layouts: 'header et footer',
  symbols: 'composants partagés',
  assets: 'médiathèque',
  redirects: 'redirections',
  name: 'nom du site',
};
const label = (n: NodeRef) => n.name ?? n.type;
/** A value for a human: lengths, tokens and short texts; anything else is abbreviated. */
export function formatValue(v: unknown): string {
  if (v === undefined) return '—';
  if (typeof v === 'string') return `« ${v.length > 60 ? `${v.slice(0, 57)}…` : v} »`;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    if (typeof o.value === 'number' && typeof o.unit === 'string') return `${o.value}${o.unit}`;
    if (typeof o.token === 'string') return `token ${o.token}`;
    if (Array.isArray(v) && v.every((x) => x && typeof x === 'object' && 'text' in x))
      return formatValue(v.map((x) => (x as { text: string }).text).join(''));
  }
  const json = JSON.stringify(v);
  return json.length > 60 ? `${json.slice(0, 57)}…` : json;
}

/** The diff in sentences (French), for proposal reviews and update previews. */
export function summarize(diff: SiteDiff): string[] {
  if (diff.empty) return ['Aucun changement.'];
  return [
    ...(diff.added.length
      ? [`${diff.added.length} élément(s) ajouté(s) : ${diff.added.map(label).join(', ')}`]
      : []),
    ...(diff.removed.length
      ? [`${diff.removed.length} élément(s) supprimé(s) : ${diff.removed.map(label).join(', ')}`]
      : []),
    ...diff.changed.flatMap((c) => [
      ...c.props.map((p) => `${label(c)} · ${p.key} : ${formatValue(p.before)} → ${formatValue(p.after)}`),
      ...c.style.map(
        (s) =>
          `${label(c)} · ${s.key} (${s.breakpoint}) : ${formatValue(s.before)} → ${formatValue(s.after)}`,
      ),
      ...c.other.filter((o) => o !== 'children' || !c.props.length).map((o) => `${label(c)} · ${o} modifié`),
    ]),
    ...diff.site.map((s) => `Site · ${SITE_LABELS[s.key] ?? s.key} modifié`),
  ];
}

/** Counts only, without any content: what the operation journal keeps (CS-09, CS-11). */
export const countChanges = (diff: SiteDiff) =>
  `${diff.added.length} ajout(s), ${diff.changed.length} modification(s), ${diff.removed.length} suppression(s)${diff.site.length ? `, site : ${diff.site.map((s) => SITE_LABELS[s.key] ?? s.key).join(', ')}` : ''}`;
