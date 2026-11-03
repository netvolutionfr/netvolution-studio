import { z } from 'zod';
import { type Animation, animationSchema } from '../document/animations.ts';
import { assetLinkTargets, pageLinkTargets } from '../document/links.ts';
import {
  type Asset,
  assetSchema,
  customClassSchema,
  type DocNode,
  entityIdSchema,
  type Instance,
  instanceSchema,
  isPicture,
  type Layout,
  type Menu,
  menuSchema,
  nodeAtPath,
  nodeIdSchema,
  type Page,
  type Redirect,
  type Seo,
  type Site,
  type SiteSymbol,
  SYMBOL_CATEGORIES,
  slugSchema,
  subtree,
} from '../document/schema.ts';
import { fieldAssets, type Registry } from '../registry/registry.ts';
import { CUSTOM_CSS_MAX, checkCustomCss, customCssAssets } from '../style/custom.ts';
import {
  backgroundAssets,
  type ResponsiveStyle,
  type StyleDecls,
  styleDeclsSchema,
  tokenIdSchema,
} from '../style/schema.ts';
import { EMPTY_TOKENS, TOKEN_KINDS, type TokenKind, tokenRefs } from '../style/tokens.ts';

export type CommandContext = { registry: Registry; newId: (doc: Site) => string };
export type CommandError = { code: 'not-found' | 'not-allowed' | 'invalid'; message: string };
export type CommandResult =
  /** `created`: new node ids (the first is selected); `page`: page to show. */
  /** `notice`: information for the user (e.g. instances left out of an update). */
  | { ok: true; doc: Site; created?: string[]; page?: string; notice?: string }
  | { ok: false; error: CommandError };

export interface Command<P> {
  name: string;
  /** Validated before `apply`; also the future tool schema for automation/AI. */
  params: z.ZodType<P>;
  apply(doc: Site, params: P, ctx: CommandContext): CommandResult;
}

const fail = (code: CommandError['code'], message: string): CommandResult => ({
  ok: false,
  error: { code, message },
});
const withNodes = (doc: Site, nodes: Record<string, DocNode>): Site => ({
  ...doc,
  nodes: { ...doc.nodes, ...nodes },
});

export const parentOf = (doc: Site, id: string) =>
  Object.values(doc.nodes).find((n) => n.children.includes(id));

const descendants = (doc: Site, id: string): string[] => {
  const children = doc.nodes[id]?.children ?? [];
  return children.flatMap((c) => [c, ...descendants(doc, c)]);
};

const insertAt = (list: string[], index: number, id: string) => {
  const next = [...list];
  next.splice(Math.max(0, Math.min(index, next.length)), 0, id);
  return next;
};

const breakpointKey = z.string().regex(/^(?:base|[a-z][a-z0-9-]{0,31})$/);

export const updateNodeProps: Command<{ id: string; props: Record<string, unknown> }> = {
  name: 'updateNodeProps',
  params: z.strictObject({ id: nodeIdSchema, props: z.record(z.string(), z.unknown()) }),
  apply(doc, { id, props }) {
    const node = doc.nodes[id];
    if (!node) return fail('not-found', `Nœud inexistant : ${id}`);
    return {
      ok: true,
      doc: withNodes(doc, { [id]: { ...node, props: { ...node.props, ...(props as DocNode['props']) } } }),
    };
  },
};

export const updateNodeStyle: Command<{
  id: string;
  breakpoint: string;
  set?: StyleDecls | undefined;
  unset?: string[] | undefined;
}> = {
  name: 'updateNodeStyle',
  params: z.strictObject({
    id: nodeIdSchema,
    breakpoint: breakpointKey,
    set: styleDeclsSchema.optional(),
    unset: z.array(z.string()).optional(),
  }),
  apply(doc, { id, breakpoint, set, unset }) {
    const node = doc.nodes[id];
    if (!node) return fail('not-found', `Nœud inexistant : ${id}`);
    if (breakpoint !== 'base' && !doc.breakpoints.some((b) => b.id === breakpoint)) {
      return fail('invalid', `Breakpoint inconnu : ${breakpoint}`);
    }
    const decls: Record<string, unknown> = { ...node.style[breakpoint], ...set };
    for (const key of unset ?? []) delete decls[key];
    const style = { ...node.style, [breakpoint]: decls as StyleDecls };
    if (!Object.keys(decls).length) delete style[breakpoint];
    return { ok: true, doc: withNodes(doc, { [id]: { ...node, style } }) };
  },
};

/** Subtree to insert: types with optional overrides of their defaults (presets, paste, automation). */
export type NodeTemplate = {
  type: string;
  name?: string | undefined;
  props?: Record<string, unknown> | undefined;
  style?: ResponsiveStyle | undefined;
  children?: NodeTemplate[] | undefined;
  /** Kept by copies of linked instances (ADR-0011); checked by `loadSite` (definition, cycles). */
  instance?: Instance | undefined;
  classes?: string[] | undefined;
};
export const nodeTemplateSchema: z.ZodType<NodeTemplate> = z.lazy(() =>
  z.strictObject({
    type: z.string(),
    name: z.string().max(120).optional(),
    props: z.record(z.string(), z.unknown()).optional(),
    style: z.record(z.string(), styleDeclsSchema).optional(),
    children: z.array(nodeTemplateSchema).max(200).optional(),
    instance: instanceSchema.optional(),
    classes: z.array(customClassSchema).max(8).optional(),
  }),
);

/** Subtree of `id` as a template (copy/paste, presets): same content, ids dropped. */
export function toTemplate(doc: Site, id: string): NodeTemplate | null {
  const node = doc.nodes[id];
  if (!node) return null;
  return {
    type: node.type,
    ...(node.name ? { name: node.name } : {}),
    props: structuredClone(node.props),
    style: structuredClone(node.style),
    ...(node.instance ? { instance: structuredClone(node.instance) } : {}),
    ...(node.classes ? { classes: [...node.classes] } : {}),
    children: node.children.map((c) => toTemplate(doc, c)).filter((t): t is NodeTemplate => t !== null),
  };
}

/** Adds the nodes of `tpl` (unattached); returns the new root id, or null on an unknown type. */
export function buildTree(
  doc: Site,
  tpl: NodeTemplate,
  ctx: CommandContext,
): { doc: Site; id: string } | null {
  let next = doc;
  const build = (t: NodeTemplate): string | null => {
    const def = ctx.registry.get(t.type);
    if (!def) return null;
    const id = ctx.newId(next);
    const node: DocNode = {
      id,
      type: t.type,
      ...(t.name ? { name: t.name } : {}),
      props: structuredClone({ ...def.defaults.props, ...t.props }) as DocNode['props'],
      style: structuredClone(t.style ?? def.defaults.style ?? {}),
      children: [],
      ...(t.instance ? { instance: structuredClone(t.instance) } : {}),
      ...(t.classes?.length ? { classes: [...t.classes] } : {}),
    };
    next = withNodes(next, { [id]: node });
    const children = (t.children ?? []).map(build);
    if (children.includes(null)) return null;
    next = withNodes(next, { [id]: { ...node, children: children as string[] } });
    return id;
  };
  const id = build(tpl);
  return id ? { doc: next, id } : null;
}

export const insertTree: Command<{ parentId: string; index: number; tree: NodeTemplate }> = {
  name: 'insertTree',
  params: z.strictObject({
    parentId: nodeIdSchema,
    index: z.number().int().min(0),
    tree: nodeTemplateSchema,
  }),
  apply(doc, { parentId, index, tree }, ctx) {
    const parent = doc.nodes[parentId];
    if (!parent) return fail('not-found', `Parent inexistant : ${parentId}`);
    if (!ctx.registry.canContain(parent.type, tree.type))
      return fail('not-allowed', `${tree.type} interdit dans ${parent.type}`);
    const built = buildTree(doc, tree, ctx);
    if (!built) return fail('not-found', 'Type inconnu dans le modèle');
    // Nesting inside the template is checked by the full validation run after every command.
    const next = withNodes(built.doc, {
      [parentId]: { ...parent, children: insertAt(parent.children, index, built.id) },
    });
    return { ok: true, doc: next, created: [built.id] };
  },
};

export const insertNode: Command<{ parentId: string; index: number; type: string }> = {
  name: 'insertNode',
  params: z.strictObject({ parentId: nodeIdSchema, index: z.number().int().min(0), type: z.string() }),
  apply: (doc, { parentId, index, type }, ctx) =>
    insertTree.apply(doc, { parentId, index, tree: { type } }, ctx),
};

export const moveNode: Command<{ id: string; parentId: string; index: number }> = {
  name: 'moveNode',
  params: z.strictObject({ id: nodeIdSchema, parentId: nodeIdSchema, index: z.number().int().min(0) }),
  apply(doc, { id, parentId, index }, ctx) {
    const node = doc.nodes[id];
    const target = doc.nodes[parentId];
    const source = parentOf(doc, id);
    if (!node || !target) return fail('not-found', 'Nœud ou destination inexistant');
    if (!source) return fail('not-allowed', 'La racine ne peut pas être déplacée');
    if (id === parentId || descendants(doc, id).includes(parentId)) {
      return fail('not-allowed', 'Un élément ne peut pas être déplacé dans lui-même');
    }
    if (!ctx.registry.canContain(target.type, node.type))
      return fail('not-allowed', `${node.type} interdit dans ${target.type}`);
    const without = source.children.filter((c) => c !== id);
    if (source.id === parentId) {
      return {
        ok: true,
        doc: withNodes(doc, { [parentId]: { ...source, children: insertAt(without, index, id) } }),
      };
    }
    return {
      ok: true,
      doc: withNodes(doc, {
        [source.id]: { ...source, children: without },
        [parentId]: { ...target, children: insertAt(target.children, index, id) },
      }),
    };
  },
};

export const removeNode: Command<{ id: string }> = {
  name: 'removeNode',
  params: z.strictObject({ id: nodeIdSchema }),
  apply(doc, { id }) {
    const parent = parentOf(doc, id);
    if (!doc.nodes[id]) return fail('not-found', `Nœud inexistant : ${id}`);
    if (!parent) return fail('not-allowed', 'La racine ne peut pas être supprimée');
    const nodes = {
      ...doc.nodes,
      [parent.id]: { ...parent, children: parent.children.filter((c) => c !== id) },
    };
    for (const gone of [id, ...descendants(doc, id)]) delete nodes[gone];
    return { ok: true, doc: { ...doc, nodes } };
  },
};

export const duplicateNode: Command<{ id: string }> = {
  name: 'duplicateNode',
  params: z.strictObject({ id: nodeIdSchema }),
  apply(doc, { id }, ctx) {
    const parent = parentOf(doc, id);
    if (!doc.nodes[id]) return fail('not-found', `Nœud inexistant : ${id}`);
    if (!parent) return fail('not-allowed', 'La racine ne peut pas être dupliquée');
    let next = doc;
    const added: Record<string, DocNode> = {};
    const copy = (sourceId: string): string => {
      const source = doc.nodes[sourceId] as DocNode;
      const newId = ctx.newId(next);
      // Reserve the id before recursing so siblings never collide.
      next = withNodes(next, { [newId]: source });
      added[newId] = { ...structuredClone(source), id: newId, children: source.children.map(copy) };
      return newId;
    };
    const cloneId = copy(id);
    const children = insertAt(parent.children, parent.children.indexOf(id) + 1, cloneId);
    return {
      ok: true,
      doc: withNodes(doc, { ...added, [parent.id]: { ...parent, children } }),
      created: [cloneId],
    };
  },
};

export const renameNode: Command<{ id: string; name: string }> = {
  name: 'renameNode',
  params: z.strictObject({ id: nodeIdSchema, name: z.string().max(120) }),
  apply(doc, { id, name }) {
    const node = doc.nodes[id];
    if (!node) return fail('not-found', `Nœud inexistant : ${id}`);
    const { name: _old, ...rest } = node;
    return { ok: true, doc: withNodes(doc, { [id]: name.trim() ? { ...rest, name: name.trim() } : rest }) };
  },
};

export const addAsset: Command<{ asset: Asset }> = {
  name: 'addAsset',
  params: z.strictObject({ asset: assetSchema }),
  apply(doc, { asset }) {
    if (doc.assets[asset.id]) return fail('invalid', `Média déjà présent : ${asset.id}`);
    return { ok: true, doc: { ...doc, assets: { ...doc.assets, [asset.id]: asset } } };
  },
};

/** Nodes and menus using a media (component field or link): usage count, removal guard. */
export function assetReferences(doc: Site, registry: Registry, id: string): string[] {
  const nodes = Object.values(doc.nodes).filter(
    (n) =>
      assetLinkTargets(n.props).includes(id) ||
      backgroundAssets(n.style).includes(id) ||
      fieldAssets(registry.get(n.type), n.props).some((ref) => ref.id === id),
  );
  const menus = (doc.menus ?? []).filter((m) => assetLinkTargets(m.items).includes(id));
  const css = customCssAssets(doc.customCss).includes(id) ? ['customCss'] : [];
  return [...nodes.map((n) => n.id), ...menus.map((m) => m.id), ...css];
}

/** Library metadata of a media: name, default text alternative (images, SVG), tags. */
export const updateAsset: Command<{
  id: string;
  name?: string | undefined;
  alt?: string | undefined;
  tags?: string[] | undefined;
  font?: { family: string; weight: { min: number; max: number }; style: 'normal' | 'italic' } | undefined;
}> = {
  name: 'updateAsset',
  params: z.strictObject({
    id: z.string(),
    name: z.string().max(200).optional(),
    alt: z.string().max(300).optional(),
    tags: z.array(z.string()).optional(),
    /** Font description (ADR-0018), checked by the site schema. */
    font: z
      .strictObject({
        family: z.string(),
        weight: z.strictObject({ min: z.number(), max: z.number() }),
        style: z.enum(['normal', 'italic']),
      })
      .optional(),
  }),
  apply(doc, { id, name, alt, tags, font }) {
    const asset = doc.assets[id];
    if (!asset) return fail('not-found', `Média inexistant : ${id}`);
    if (alt !== undefined && !isPicture(asset))
      return fail('invalid', 'Seule une image a un texte alternatif');
    if (font !== undefined && asset.kind !== 'font') return fail('invalid', 'Ce média n’est pas une police');
    const next = {
      ...asset,
      ...font,
      ...(name !== undefined && { name }),
      ...(alt !== undefined && { alt }),
      // Kept as typed (the inspector field round-trips them); empty tags are refused by the schema.
      ...(tags !== undefined && { tags }),
    };
    return { ok: true, doc: { ...doc, assets: { ...doc.assets, [id]: next as Asset } } };
  },
};

/** Removes a media from the library; refused while it is used. The file stays in the project folder. */
export const removeAsset: Command<{ id: string }> = {
  name: 'removeAsset',
  params: z.strictObject({ id: z.string() }),
  apply(doc, { id }, ctx) {
    if (!doc.assets[id]) return fail('not-found', `Média inexistant : ${id}`);
    const used = assetReferences(doc, ctx.registry, id).length;
    if (used) return fail('not-allowed', `Média utilisé par ${used} élément(s) ou menu(s)`);
    const { [id]: _, ...assets } = doc.assets;
    return { ok: true, doc: { ...doc, assets } };
  },
};

// --- Pages (SB-02). Slug rules and uniqueness are checked by the validation run after every command.

const withPage = (doc: Site, page: Page): Site => ({
  ...doc,
  pages: doc.pages.map((p) => (p.id === page.id ? page : p)),
});
const findPage = (doc: Site, id: string) => doc.pages.find((p) => p.id === id);

/** First free slug among `base`, `base-2`, `base-3`… */
export function freeSlug(doc: Site, base: string): string {
  const taken = new Set(doc.pages.map((p) => p.slug));
  for (let i = 1; ; i++) {
    const slug = i === 1 ? base : `${base}-${i}`;
    if (!taken.has(slug)) return slug;
  }
}

/** Nodes whose props link to `pageId` (slug change warning, page removal). */
export const pageReferences = (doc: Site, pageId: string) =>
  Object.values(doc.nodes)
    .filter((n) => pageLinkTargets(n.props).includes(pageId))
    .map((n) => n.id);

export const createPage: Command<{
  title: string;
  slug: string;
  tree: NodeTemplate;
  index?: number | undefined;
}> = {
  name: 'createPage',
  params: z.strictObject({
    title: z.string().max(200),
    slug: slugSchema,
    tree: nodeTemplateSchema,
    index: z.number().int().min(0).optional(),
  }),
  apply(doc, { title, slug, tree, index }, ctx) {
    const built = buildTree(doc, tree, ctx);
    if (!built) return fail('not-found', 'Type inconnu dans le modèle');
    const page: Page = { id: newPageId(doc), title, slug, rootId: built.id, publish: true };
    const pages = [...doc.pages];
    pages.splice(index ?? pages.length, 0, page);
    return { ok: true, doc: { ...built.doc, pages }, page: page.id };
  },
};

export const updatePage: Command<{
  id: string;
  title?: string | undefined;
  slug?: string | undefined;
  publish?: boolean | undefined;
  seo?: Seo | null | undefined;
}> = {
  name: 'updatePage',
  params: z.strictObject({
    id: entityIdSchema,
    title: z.string().max(200).optional(),
    slug: slugSchema.optional(),
    publish: z.boolean().optional(),
    /** Replaces the page's SEO metadata (checked by the validation after the command); null removes it. */
    seo: z.record(z.string(), z.unknown()).nullable().optional(),
  }),
  apply(doc, { id, seo, ...patch }) {
    const page = findPage(doc, id);
    if (!page) return fail('not-found', `Page inexistante : ${id}`);
    const defined = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
    const { seo: current, ...rest } = { ...page, ...defined };
    const next = seo === null ? rest : { ...rest, ...((seo ?? current) && { seo: (seo ?? current) as Seo }) };
    return { ok: true, doc: withPage(doc, next) };
  },
};

export const duplicatePage: Command<{ id: string }> = {
  name: 'duplicatePage',
  params: z.strictObject({ id: entityIdSchema }),
  apply(doc, { id }, ctx) {
    const page = findPage(doc, id);
    const tree = page && toTemplate(doc, page.rootId);
    if (!page || !tree) return fail('not-found', `Page inexistante : ${id}`);
    return createPage.apply(
      doc,
      {
        title: `${page.title} (copie)`,
        slug: freeSlug(doc, page.slug ? `${page.slug}-copie` : 'accueil-copie'),
        tree,
        index: doc.pages.indexOf(page) + 1,
      },
      ctx,
    );
  },
};

export const removePage: Command<{ id: string }> = {
  name: 'removePage',
  params: z.strictObject({ id: entityIdSchema }),
  apply(doc, { id }) {
    const page = findPage(doc, id);
    if (!page) return fail('not-found', `Page inexistante : ${id}`);
    if (id === doc.settings.homePageId)
      return fail('not-allowed', "La page d'accueil ne peut pas être supprimée");
    const gone = new Set(subtree(doc, page.rootId));
    const linked = pageReferences(doc, id).filter((n) => !gone.has(n));
    if (linked.length) return fail('not-allowed', `Page liée depuis ${linked.length} élément(s)`);
    if (pageLinkTargets(doc.menus ?? []).includes(id))
      return fail('not-allowed', 'Page présente dans un menu : retirez-la du menu d’abord');
    const nodes = { ...doc.nodes };
    for (const n of gone) delete nodes[n];
    return { ok: true, doc: { ...doc, nodes, pages: doc.pages.filter((p) => p.id !== id) } };
  },
};

export const movePage: Command<{ id: string; index: number }> = {
  name: 'movePage',
  params: z.strictObject({ id: entityIdSchema, index: z.number().int().min(0) }),
  apply(doc, { id, index }) {
    const page = findPage(doc, id);
    if (!page) return fail('not-found', `Page inexistante : ${id}`);
    const pages = doc.pages.filter((p) => p !== page);
    pages.splice(Math.min(index, pages.length), 0, page);
    return { ok: true, doc: { ...doc, pages } };
  },
};

/** The new home page takes the empty slug; the former one takes its previous slug. */
export const setHomePage: Command<{ id: string }> = {
  name: 'setHomePage',
  params: z.strictObject({ id: entityIdSchema }),
  apply(doc, { id }) {
    const page = findPage(doc, id);
    const former = findPage(doc, doc.settings.homePageId);
    if (!page || !former) return fail('not-found', `Page inexistante : ${id}`);
    if (page === former) return { ok: true, doc };
    const swapped = withPage(withPage(doc, { ...former, slug: page.slug }), { ...page, slug: '' });
    return { ok: true, doc: { ...swapped, settings: { ...doc.settings, homePageId: id } } };
  },
};

/** Site name and settings (SB-01); `siteUrl: null` removes the canonical origin. */
export const updateSite: Command<{
  name?: string | undefined;
  lang?: string | undefined;
  siteUrl?: string | null | undefined;
}> = {
  name: 'updateSite',
  params: z.strictObject({
    name: z.string().max(200).optional(),
    lang: z.string().max(10).optional(),
    siteUrl: z.string().max(200).nullable().optional(),
  }),
  apply(doc, { name, lang, siteUrl }) {
    const settings = { ...doc.settings, ...(lang !== undefined && { lang }) };
    if (siteUrl === null || siteUrl === '') delete settings.siteUrl;
    else if (siteUrl !== undefined) settings.siteUrl = siteUrl;
    // Value formats are checked by the full validation that follows every command.
    return { ok: true, doc: { ...doc, ...(name !== undefined && { name }), settings } };
  },
};

/** Nodes and text styles referencing token `id` of `kind` (removal guard). */
export function tokenReferences(doc: Site, kind: TokenKind, id: string): string[] {
  const uses = (decls: Record<string, unknown>) =>
    tokenRefs(decls).some((r) => r.kind === kind && r.id === id);
  return [
    ...Object.values(doc.nodes)
      .filter((n) => Object.values(n.style).some(uses))
      .map((n) => n.id),
    ...Object.entries(doc.tokens?.textStyles ?? {})
      .filter(([, t]) => Object.values(t.style).some(uses))
      .map(([tid]) => tid),
  ];
}

/** Creates or replaces a design token (ADR-0009); its value is checked by the validation after the command. */
export const setToken: Command<{ kind: TokenKind; id: string; value: unknown }> = {
  name: 'setToken',
  params: z.strictObject({ kind: z.enum(TOKEN_KINDS), id: tokenIdSchema, value: z.unknown() }),
  apply(doc, { kind, id, value }) {
    const tokens = doc.tokens ?? EMPTY_TOKENS;
    return { ok: true, doc: { ...doc, tokens: { ...tokens, [kind]: { ...tokens[kind], [id]: value } } } };
  },
};

export const removeToken: Command<{ kind: TokenKind; id: string }> = {
  name: 'removeToken',
  params: z.strictObject({ kind: z.enum(TOKEN_KINDS), id: tokenIdSchema }),
  apply(doc, { kind, id }) {
    const tokens = doc.tokens ?? EMPTY_TOKENS;
    if (!tokens[kind][id]) return fail('not-found', `Token inexistant : ${id}`);
    const refs = tokenReferences(doc, kind, id);
    if (refs.length) return fail('not-allowed', `Token utilisé par ${refs.length} élément(s) ou style(s)`);
    const { [id]: _, ...rest } = tokens[kind];
    return { ok: true, doc: { ...doc, tokens: { ...tokens, [kind]: rest } } };
  },
};

/** Adds a header or footer; it becomes the site default for its role when there is none. */
export const createLayout: Command<{ role: Layout['role']; name: string; tree: NodeTemplate }> = {
  name: 'createLayout',
  params: z.strictObject({
    role: z.enum(['header', 'footer']),
    name: z.string().max(200),
    tree: nodeTemplateSchema,
  }),
  apply(doc, { role, name, tree }, ctx) {
    const built = buildTree(doc, tree, ctx);
    if (!built) return fail('not-found', 'Type inconnu dans le modèle');
    const taken = new Set([...doc.pages.map((p) => p.id), ...(doc.layouts ?? []).map((l) => l.id)]);
    let id: string = role;
    for (let i = 2; taken.has(id); i++) id = `${role}-${i}`;
    const defaults = { ...doc.settings.defaultLayouts };
    if (!defaults[role]) defaults[role] = id;
    return {
      ok: true,
      doc: {
        ...built.doc,
        layouts: [...(doc.layouts ?? []), { id, name, role, rootId: built.id }],
        settings: { ...doc.settings, defaultLayouts: defaults },
      },
      page: id,
    };
  },
};

/** Removes a layout and its nodes; pages that chose it fall back to the default. */
export const removeLayout: Command<{ id: string }> = {
  name: 'removeLayout',
  params: z.strictObject({ id: entityIdSchema }),
  apply(doc, { id }) {
    const layout = doc.layouts?.find((l) => l.id === id);
    if (!layout) return fail('not-found', `Layout inexistant : ${id}`);
    const nodes = { ...doc.nodes };
    for (const n of subtree(doc, layout.rootId)) delete nodes[n];
    const clear = <T extends { header?: string | null | undefined; footer?: string | null | undefined }>(
      c: T,
    ) => (c[layout.role] === id ? (({ [layout.role]: _, ...rest }) => rest)(c) : c);
    return {
      ok: true,
      doc: {
        ...doc,
        nodes,
        layouts: (doc.layouts ?? []).filter((l) => l !== layout),
        settings: { ...doc.settings, defaultLayouts: clear(doc.settings.defaultLayouts ?? {}) },
        pages: doc.pages.map((p) => (p.layouts ? { ...p, layouts: clear(p.layouts) } : p)),
      },
    };
  },
};

/** Shows the site's default header/footer on a page, or none. */
export const setPageLayout: Command<{ id: string; role: Layout['role']; show: boolean }> = {
  name: 'setPageLayout',
  params: z.strictObject({ id: entityIdSchema, role: z.enum(['header', 'footer']), show: z.boolean() }),
  apply(doc, { id, role, show }) {
    const page = findPage(doc, id);
    if (!page) return fail('not-found', `Page inexistante : ${id}`);
    const { [role]: _, ...rest } = page.layouts ?? {};
    const layouts = show ? rest : { ...rest, [role]: null };
    const { layouts: __, ...base } = page;
    return { ok: true, doc: withPage(doc, Object.keys(layouts).length ? { ...base, layouts } : base) };
  },
};

/** Creates or replaces a menu (SB-03). */
export const setMenu: Command<{ menu: Menu }> = {
  name: 'setMenu',
  params: z.strictObject({ menu: menuSchema }),
  apply(doc, { menu }) {
    const menus = doc.menus ?? [];
    const exists = menus.some((m) => m.id === menu.id);
    return {
      ok: true,
      doc: { ...doc, menus: exists ? menus.map((m) => (m.id === menu.id ? menu : m)) : [...menus, menu] },
    };
  },
};

/** Removes a menu; refused while a navigation component displays it. */
export const removeMenu: Command<{ id: string }> = {
  name: 'removeMenu',
  params: z.strictObject({ id: entityIdSchema }),
  apply(doc, { id }, ctx) {
    if (!doc.menus?.some((m) => m.id === id)) return fail('not-found', `Menu inexistant : ${id}`);
    const users = Object.values(doc.nodes).filter((n) =>
      ctx.registry.get(n.type)?.fields.some((f) => f.kind === 'menu' && n.props[f.prop] === id),
    );
    if (users.length) return fail('not-allowed', `Menu affiché par ${users.length} navigation(s)`);
    return { ok: true, doc: { ...doc, menus: doc.menus.filter((m) => m.id !== id) } };
  },
};

/** Replaces the site's redirects (SB-08); each one is checked by the validation after the command. */
export const setRedirects: Command<{ redirects: Redirect[] }> = {
  name: 'setRedirects',
  params: z.strictObject({ redirects: z.array(z.record(z.string(), z.unknown())).max(500) }) as never,
  apply(doc, { redirects }) {
    const { redirects: _, ...rest } = doc;
    return { ok: true, doc: redirects.length ? { ...rest, redirects } : rest };
  },
};

// ---------- Shared components (CS-01, CS-03, ADR-0011) ----------

const findSymbol = (doc: Site, id: string) => doc.symbols?.find((sym) => sym.id === id);
const withSymbol = (doc: Site, sym: SiteSymbol): Site => ({
  ...doc,
  symbols: (doc.symbols ?? []).some((x) => x.id === sym.id)
    ? (doc.symbols ?? []).map((x) => (x.id === sym.id ? sym : x))
    : [...(doc.symbols ?? []), sym],
});
const symbolMeta = {
  name: z.string().trim().min(1).max(120),
  category: z.enum(SYMBOL_CATEGORIES),
  description: z.string().max(300),
};

/** Instance roots of a component, in the whole site. */
export const instancesOf = (doc: Site, symbolId: string) =>
  Object.values(doc.nodes).filter((n) => n.instance?.symbolId === symbolId);

/**
 * Parameters proposed for a new component: the content fields (texts, links, media) of every node
 * of its tree, addressed by child-index path.
 */
export function defaultParams(doc: Site, rootId: string, registry: Registry): SiteSymbol['params'] {
  const params: SiteSymbol['params'] = [];
  const seen = new Map<string, number>();
  const walk = (id: string, path: number[]) => {
    const node = doc.nodes[id];
    const def = node && registry.get(node.type);
    if (!node || !def) return;
    // Same-named elements are numbered (« Titre », « Titre 2 »…) so that labels stay distinct.
    const base = node.name ?? def.label;
    const count = (seen.get(base) ?? 0) + 1;
    seen.set(base, count);
    const element = count > 1 ? `${base} ${count}` : base;
    for (const f of def.fields) {
      if (
        ['text', 'textarea', 'richText', 'richTextList', 'link', 'asset'].includes(f.kind) &&
        params.length < 100
      ) {
        params.push({
          id: `p${params.length + 1}`,
          label: `${element} — ${f.label}`.slice(0, 120),
          path,
          prop: f.prop,
        });
      }
    }
    for (const [i, c] of node.children.entries()) walk(c, [...path, i]);
  };
  walk(rootId, []);
  return params;
}

/** Applies an instance's parameter values to a freshly built copy; returns the rejected parameters. */
function applyOverrides(
  doc: Site,
  rootId: string,
  sym: SiteSymbol,
  overrides: Instance['overrides'],
  registry: Registry,
) {
  let next = doc;
  const rejected: string[] = [];
  for (const [paramId, value] of Object.entries(overrides)) {
    const param = sym.params.find((p) => p.id === paramId);
    const target = param && nodeAtPath(next, rootId, param.path);
    const def = target && registry.get(target.type);
    const props = target && param ? { ...target.props, [param.prop]: value } : null;
    if (!param || !target || !def || !props || !def.props.safeParse(props).success) {
      rejected.push(param ? param.label : `${paramId} : paramètre supprimé`);
      continue;
    }
    next = withNodes(next, { [target.id]: { ...target, props: props as DocNode['props'] } });
  }
  return { doc: next, rejected };
}

/** Status of an instance against its definition (outdated, locally modified, incompatible values). */
export function instanceStatus(doc: Site, nodeId: string, registry: Registry) {
  const node = doc.nodes[nodeId];
  const sym = node?.instance && findSymbol(doc, node.instance.symbolId);
  if (!node?.instance || !sym) return null;
  const tpl = toTemplate(doc, sym.rootId);
  const built = tpl && buildTree(doc, tpl, { registry, newId: newNodeId });
  const applied = built && applyOverrides(built.doc, built.id, sym, node.instance.overrides, registry);
  const strip = (t: NodeTemplate | null): unknown =>
    t && { ...t, name: undefined, instance: undefined, children: t.children?.map(strip) };
  const expected = applied && strip(toTemplate(applied.doc, built.id));
  return {
    symbol: sym,
    outdated: node.instance.version < sym.version,
    modified: JSON.stringify(expected) !== JSON.stringify(strip(toTemplate(doc, nodeId))),
    rejected: applied?.rejected ?? [],
  };
}

/** Makes a shared component from a subtree; the subtree becomes its first instance. */
export const createSymbol: Command<{
  nodeId: string;
  name: string;
  category: SiteSymbol['category'];
  description: string;
}> = {
  name: 'createSymbol',
  params: z.strictObject({ nodeId: nodeIdSchema, ...symbolMeta }),
  apply(doc, { nodeId, name, category, description }, ctx) {
    const node = doc.nodes[nodeId];
    if (!node) return fail('not-found', `Nœud inexistant : ${nodeId}`);
    if (!parentOf(doc, nodeId))
      return fail('not-allowed', 'Une racine de page ne peut pas devenir un composant');
    if (node.instance) return fail('not-allowed', 'Cet élément est déjà une instance d’un composant');
    const tpl = toTemplate(doc, nodeId);
    const built = tpl && buildTree(doc, tpl, ctx);
    if (!built) return fail('invalid', 'Copie impossible');
    const taken = new Set([...doc.pages, ...(doc.layouts ?? []), ...(doc.symbols ?? [])].map((x) => x.id));
    const base = `c-${
      name
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 40) || 'composant'
    }`;
    let id = base;
    for (let i = 2; taken.has(id); i++) id = `${base}-${i}`;
    const sym: SiteSymbol = {
      id,
      name,
      category,
      description,
      version: 1,
      rootId: built.id,
      params: defaultParams(built.doc, built.id, ctx.registry),
    };
    const linked = { ...node, instance: { symbolId: id, version: 1, overrides: {} } };
    return { ok: true, doc: withSymbol(withNodes(built.doc, { [nodeId]: linked }), sym) };
  },
};

/** Adds a library section to the site as a shared component (its tree becomes the definition). */
export const importSymbol: Command<{
  id: string;
  name: string;
  category: SiteSymbol['category'];
  description: string;
  version: number;
  tree: NodeTemplate;
}> = {
  name: 'importSymbol',
  params: z.strictObject({
    id: entityIdSchema,
    ...symbolMeta,
    version: z.number().int().min(1),
    tree: nodeTemplateSchema,
  }),
  apply(doc, { id, tree, ...meta }, ctx) {
    if (findSymbol(doc, id)) return fail('invalid', `Composant déjà présent : ${id}`);
    const built = buildTree(doc, tree, ctx);
    if (!built) return fail('not-found', 'Type inconnu dans la section');
    const sym: SiteSymbol = {
      id,
      ...meta,
      rootId: built.id,
      params: defaultParams(built.doc, built.id, ctx.registry),
    };
    return { ok: true, doc: withSymbol(built.doc, sym) };
  },
};

/** Inserts a component: a linked instance, or an independent copy (`linked: false`). */
export const insertSymbol: Command<{ symbolId: string; parentId: string; index: number; linked: boolean }> = {
  name: 'insertSymbol',
  params: z.strictObject({
    symbolId: entityIdSchema,
    parentId: nodeIdSchema,
    index: z.number().int().min(0),
    linked: z.boolean(),
  }),
  apply(doc, { symbolId, parentId, index, linked }, ctx) {
    const sym = findSymbol(doc, symbolId);
    const tpl = sym && toTemplate(doc, sym.rootId);
    if (!sym || !tpl) return fail('not-found', `Composant inexistant : ${symbolId}`);
    const tree = linked ? { ...tpl, instance: { symbolId, version: sym.version, overrides: {} } } : tpl;
    return insertTree.apply(doc, { parentId, index, tree }, ctx);
  },
};

/** Sets a parameter of an instance (its own value, kept across updates). */
export const setOverride: Command<{ id: string; paramId: string; value: unknown }> = {
  name: 'setOverride',
  params: z.strictObject({ id: nodeIdSchema, paramId: z.string(), value: z.unknown() }),
  apply(doc, { id, paramId, value }) {
    const node = doc.nodes[id];
    const sym = node?.instance && findSymbol(doc, node.instance.symbolId);
    const param = sym?.params.find((p) => p.id === paramId);
    const target = param && nodeAtPath(doc, id, param.path);
    if (!node?.instance || !param || !target) return fail('not-found', 'Paramètre inexistant');
    const root = doc.nodes[id] as DocNode;
    const instance = {
      ...node.instance,
      overrides: { ...node.instance.overrides, [paramId]: value as never },
    };
    const nodes: Record<string, DocNode> = {
      [target.id]: { ...target, props: { ...target.props, [param.prop]: value as never } },
    };
    nodes[id] = { ...(target.id === id ? (nodes[id] as DocNode) : root), instance };
    return { ok: true, doc: withNodes(doc, nodes) };
  },
};

/** Metadata and parameters of a component. */
export const updateSymbol: Command<{
  id: string;
  name?: string | undefined;
  category?: SiteSymbol['category'] | undefined;
  description?: string | undefined;
  params?: SiteSymbol['params'] | undefined;
}> = {
  name: 'updateSymbol',
  params: z.strictObject({
    id: entityIdSchema,
    name: symbolMeta.name.optional(),
    category: symbolMeta.category.optional(),
    description: symbolMeta.description.optional(),
    params: z.array(z.record(z.string(), z.unknown())).max(100).optional(),
  }) as never,
  apply(doc, { id, ...patch }) {
    const sym = findSymbol(doc, id);
    if (!sym) return fail('not-found', `Composant inexistant : ${id}`);
    const defined = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
    return { ok: true, doc: withSymbol(doc, { ...sym, ...defined }) };
  },
};

/** Publishes the edited definition as a new version: instances become outdated until updated. */
export const publishSymbol: Command<{ id: string }> = {
  name: 'publishSymbol',
  params: z.strictObject({ id: entityIdSchema }),
  apply(doc, { id }) {
    const sym = findSymbol(doc, id);
    if (!sym) return fail('not-found', `Composant inexistant : ${id}`);
    return { ok: true, doc: withSymbol(doc, { ...sym, version: sym.version + 1 }) };
  },
};

/**
 * Rebuilds instances from the current definition, keeping their parameter values. An instance whose
 * values no longer fit (parameter removed, invalid value) is left unchanged and reported.
 */
export const updateInstances: Command<{ symbolId: string; ids?: string[] | undefined }> = {
  name: 'updateInstances',
  params: z.strictObject({ symbolId: entityIdSchema, ids: z.array(nodeIdSchema).optional() }),
  apply(doc, { symbolId, ids }, ctx) {
    const sym = findSymbol(doc, symbolId);
    if (!sym) return fail('not-found', `Composant inexistant : ${symbolId}`);
    const tpl = toTemplate(doc, sym.rootId);
    if (!tpl) return fail('not-found', 'Définition vide');
    const targets = instancesOf(doc, symbolId).filter((n) => !ids || ids.includes(n.id));
    let next = doc;
    const skipped: string[] = [];
    let updated = 0;
    for (const old of targets) {
      const parent = parentOf(next, old.id);
      const built = parent && buildTree(next, tpl, ctx);
      if (!parent || !built || !old.instance) continue;
      const { doc: withValues, rejected } = applyOverrides(
        built.doc,
        built.id,
        sym,
        old.instance.overrides,
        ctx.registry,
      );
      if (rejected.length) {
        skipped.push(`« ${old.name ?? sym.name} » (${rejected.join(', ')})`);
        continue;
      }
      const nodes = { ...withValues.nodes };
      for (const gone of subtree(next, old.id)) delete nodes[gone];
      const root = nodes[built.id] as DocNode;
      nodes[built.id] = {
        ...root,
        ...(old.name ? { name: old.name } : {}),
        instance: { ...old.instance, version: sym.version },
      };
      const latestParent = nodes[parent.id] as DocNode;
      nodes[parent.id] = {
        ...latestParent,
        children: latestParent.children.map((c) => (c === old.id ? built.id : c)),
      };
      next = { ...withValues, nodes };
      updated++;
    }
    if (!updated && skipped.length)
      return fail('invalid', `Mise à jour impossible : valeurs incompatibles pour ${skipped.join(' ; ')}`);
    return {
      ok: true,
      doc: next,
      notice: skipped.length
        ? `${updated} instance(s) mise(s) à jour ; non mises à jour (valeurs incompatibles) : ${skipped.join(' ; ')}`
        : `${updated} instance(s) mise(s) à jour`,
    };
  },
};

/** Turns an instance into an independent copy. */
export const detachInstance: Command<{ id: string }> = {
  name: 'detachInstance',
  params: z.strictObject({ id: nodeIdSchema }),
  apply(doc, { id }) {
    const node = doc.nodes[id];
    if (!node?.instance) return fail('not-found', 'Cet élément n’est pas une instance');
    const { instance: _, ...rest } = node;
    return { ok: true, doc: withNodes(doc, { [id]: rest }) };
  },
};

/** Removes a component definition; refused while instances exist (detach or delete them first). */
export const removeSymbol: Command<{ id: string }> = {
  name: 'removeSymbol',
  params: z.strictObject({ id: entityIdSchema }),
  apply(doc, { id }) {
    const sym = findSymbol(doc, id);
    if (!sym) return fail('not-found', `Composant inexistant : ${id}`);
    const used = instancesOf(doc, id).length;
    if (used) return fail('not-allowed', `Composant utilisé par ${used} instance(s)`);
    const nodes = { ...doc.nodes };
    for (const n of subtree(doc, sym.rootId)) delete nodes[n];
    return { ok: true, doc: { ...doc, nodes, symbols: (doc.symbols ?? []).filter((x) => x !== sym) } };
  },
};

/** Replaces the animations of a node (ADR-0012); each one is checked by the schema. */
export const setAnimations: Command<{ id: string; animations: Animation[] }> = {
  name: 'setAnimations',
  params: z.strictObject({ id: nodeIdSchema, animations: z.array(animationSchema).max(5) }),
  apply(doc, { id, animations }) {
    const node = doc.nodes[id];
    if (!node) return fail('not-found', `Nœud inexistant : ${id}`);
    const { animations: _, ...rest } = node;
    return { ok: true, doc: withNodes(doc, { [id]: animations.length ? { ...rest, animations } : rest }) };
  },
};

/** Project stylesheet (ADR-0023): refused when the parser rejects it; empty removes it. */
export const setProjectCss: Command<{ css: string }> = {
  name: 'setProjectCss',
  params: z.strictObject({ css: z.string().max(CUSTOM_CSS_MAX) }),
  apply(doc, { css }) {
    const { customCss: _, ...rest } = doc;
    if (!css.trim()) return { ok: true, doc: rest };
    const check = checkCustomCss(css);
    if (!check.ok) {
      const e = check.errors[0];
      return fail('invalid', `CSS du projet, ligne ${e?.line} : ${e?.message}`);
    }
    return { ok: true, doc: { ...rest, customCss: css } };
  },
};

/** Custom classes of a node (ADR-0023); an empty list removes them. */
export const setNodeClasses: Command<{ id: string; classes: string[] }> = {
  name: 'setNodeClasses',
  params: z.strictObject({ id: nodeIdSchema, classes: z.array(customClassSchema).max(8) }),
  apply(doc, { id, classes }) {
    const node = doc.nodes[id];
    if (!node) return fail('not-found', `Nœud inexistant : ${id}`);
    const { classes: _, ...rest } = node;
    const unique = [...new Set(classes)];
    return { ok: true, doc: withNodes(doc, { [id]: unique.length ? { ...rest, classes: unique } : rest }) };
  },
};

export const commands = {
  setProjectCss,
  setNodeClasses,
  setAnimations,
  createSymbol,
  importSymbol,
  insertSymbol,
  setOverride,
  updateSymbol,
  publishSymbol,
  updateInstances,
  detachInstance,
  removeSymbol,
  setRedirects,
  updateAsset,
  removeAsset,
  createLayout,
  removeLayout,
  setPageLayout,
  setMenu,
  removeMenu,
  updateSite,
  setToken,
  removeToken,
  addAsset,
  insertTree,
  updateNodeProps,
  updateNodeStyle,
  insertNode,
  moveNode,
  removeNode,
  duplicateNode,
  renameNode,
  createPage,
  updatePage,
  duplicatePage,
  removePage,
  movePage,
  setHomePage,
};
export type CommandName = keyof typeof commands;
export type CommandParams<N extends CommandName> = (typeof commands)[N] extends Command<infer P> ? P : never;

/** Random, collision-checked node id matching `nodeIdSchema`. */
export function newNodeId(doc: Site): string {
  for (;;) {
    const bytes = crypto.getRandomValues(new Uint8Array(10));
    const id = `n${[...bytes].map((b) => (b % 36).toString(36)).join('')}`;
    if (!doc.nodes[id]) return id;
  }
}

/** Random, collision-checked page id. */
export function newPageId(doc: Site): string {
  for (;;) {
    const bytes = crypto.getRandomValues(new Uint8Array(8));
    const id = `p${[...bytes].map((b) => (b % 36).toString(36)).join('')}`;
    if (!doc.pages.some((p) => p.id === id)) return id;
  }
}
