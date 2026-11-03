import { z } from 'zod';
import type { MessageKey } from '../i18n/index.ts';
import { CUSTOM_CSS_MAX } from '../style/custom.ts';
import { styleDeclsSchema } from '../style/schema.ts';
import { familyNameSchema, tokensSchema } from '../style/tokens.ts';
import { animationSchema } from './animations.ts';
import { entityIdSchema } from './ids.ts';
import { linkSchema } from './links.ts';

export const SCHEMA_VERSION = 2;

export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };
const jsonSchema: z.ZodType<Json> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonSchema),
    z.record(z.string(), jsonSchema),
  ]),
);

/** Stable, unique, and safe to use as a CSS class suffix. */
export const nodeIdSchema = z.string().regex(/^n[a-z0-9]{8,32}$/, 'schema.nodeId' satisfies MessageKey);

export const breakpointSchema = z.strictObject({
  id: z
    .string()
    .regex(/^[a-z][a-z0-9-]{0,31}$/)
    .refine((id) => id !== 'base', '"base" is reserved'),
  label: z.string().min(1).max(40),
  maxWidth: z.number().int().min(1).max(10000),
});

const paramIdSchema = z.string().regex(/^[a-z][a-z0-9-]{0,31}$/);

/**
 * Marks the root of a linked copy of a shared component (ADR-0011): the definition, the version it
 * was built from, and its own values of the definition's parameters.
 */
export const instanceSchema = z.strictObject({
  symbolId: z.lazy(() => entityIdSchema),
  version: z.number().int().min(1),
  overrides: z.record(paramIdSchema, jsonSchema),
});
export type Instance = z.infer<typeof instanceSchema>;

export const customClassSchema = z
  .string()
  .regex(/^(?!ns-)[a-z][a-z0-9-]{0,39}$/, 'schema.className' satisfies MessageKey);

export const nodeSchema = z.strictObject({
  id: nodeIdSchema,
  type: z.string().regex(/^[a-z][a-z0-9-]{0,63}$/),
  name: z.string().max(120).optional(),
  props: z.record(z.string(), jsonSchema),
  style: z.record(z.string(), styleDeclsSchema),
  children: z.array(nodeIdSchema),
  instance: instanceSchema.optional(),
  /** Declarative animations (ADR-0012). */
  animations: z.array(animationSchema).max(5).optional(),
  /** Custom classes (ADR-0023), the hooks of the project stylesheet; `ns-` is reserved. */
  classes: z.array(customClassSchema).min(1).max(8).optional(),
});

/** Library metadata shared by every media kind (SB-06); optional, so older sites stay valid. */
const assetMeta = {
  id: z.string().regex(/^a[a-z0-9]{8,32}$/),
  file: z.string().regex(/^[a-z0-9][a-z0-9._-]{0,127}$/),
  name: z.string().max(200).optional(),
  tags: z.array(z.string().min(1).max(40)).max(20).optional(),
};
export const IMAGE_MIMES = ['image/png', 'image/jpeg', 'image/webp', 'image/avif'] as const;
/** Downloadable files: whitelisted types only, served as attachments. */
export const FILE_MIMES = [
  'application/pdf',
  'application/zip',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
] as const;
const fontWeight = z.number().int().min(1).max(1000);
const dimensions = { width: z.number().int().positive(), height: z.number().int().positive() };
/** Default text alternative, proposed when the media is placed (the context may need another one). */
const alt = z.string().max(300).optional();

export const assetSchema = z.discriminatedUnion('kind', [
  z.strictObject({ ...assetMeta, kind: z.literal('image'), mime: z.enum(IMAGE_MIMES), ...dimensions, alt }),
  z.strictObject({
    ...assetMeta,
    kind: z.literal('svg'),
    mime: z.literal('image/svg+xml'),
    ...dimensions,
    alt,
  }),
  z.strictObject({
    ...assetMeta,
    kind: z.literal('file'),
    mime: z.enum(FILE_MIMES),
    size: z.number().int().min(0),
  }),
  // Imported font file (ADR-0018): self-hosted, declared with @font-face in the canvas and the export.
  z.strictObject({
    ...assetMeta,
    kind: z.literal('font'),
    mime: z.literal('font/woff2'),
    size: z.number().int().min(0),
    family: familyNameSchema,
    /** A single weight, or the range of a variable font. */
    weight: z
      .strictObject({ min: fontWeight, max: fontWeight })
      .refine((w) => w.min <= w.max, 'schema.fontWeights' satisfies MessageKey),
    style: z.enum(['normal', 'italic']),
    /** Licence and author of the font, reproduced in the export. */
    license: z.string().max(500).optional(),
  }),
]);

/** Media placed as an image (image or SVG), as opposed to downloadable files and fonts. */
export const isPicture = (asset: Asset | undefined): asset is Extract<Asset, { kind: 'image' | 'svg' }> =>
  asset?.kind === 'image' || asset?.kind === 'svg';

export { entityIdSchema } from './ids.ts';

/**
 * URL path of a page, without leading or trailing slash; '' is the home page.
 * Lowercase words separated by '-', segments by '/'.
 */
export const slugSchema = z
  .string()
  .max(200)
  .regex(
    /^(?:[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*)?$/,
    'schema.slug' satisfies MessageKey,
  );

/** Header and footer choice: absent = site default, null = none, else a layout id. */
export const layoutChoiceSchema = z.strictObject({
  header: entityIdSchema.nullable().optional(),
  footer: entityIdSchema.nullable().optional(),
});

export const pageSchema = z.strictObject({
  id: entityIdSchema,
  title: z.string().max(200),
  slug: slugSchema,
  rootId: nodeIdSchema,
  /** Excluded from the export when false. */
  publish: z.boolean(),
  /** Header/footer of this page; absent = site default, null = none. */
  layouts: layoutChoiceSchema.optional(),
  seo: z.lazy(() => seoSchema).optional(),
});

/** Search and sharing metadata of a page (SB-08); absent fields fall back to the page and site. */
export const seoSchema = z.strictObject({
  title: z.string().max(120).optional(),
  description: z.string().max(320).optional(),
  /** Absolute canonical URL, when it differs from the page's own address. */
  canonical: z
    .string()
    .max(500)
    .regex(/^https?:\/\/[^\s<>"]+$/, 'schema.absoluteUrl' satisfies MessageKey)
    .optional(),
  /** false: `noindex`, and left out of the sitemap. */
  index: z.boolean().optional(),
  /** Sharing image (Open Graph): an image or SVG of the library. */
  image: z
    .string()
    .regex(/^a[a-z0-9]{8,32}$/)
    .optional(),
});
export type Seo = z.infer<typeof seoSchema>;

/** Old address → page or URL (SB-08); exported as configuration for common hosts, not enforced by static files. */
export const redirectSchema = z.strictObject({
  from: z
    .string()
    .max(300)
    .regex(/^\/(?:[a-z0-9._~-]+\/)*(?:[a-z0-9._~-]+)?$/i, 'schema.path' satisfies MessageKey),
  to: linkSchema,
  permanent: z.boolean(),
});
export type Redirect = z.infer<typeof redirectSchema>;

/** Shared composition shown on the pages (SB-04): a root of the node table, like a page. */
export const layoutSchema = z.strictObject({
  id: entityIdSchema,
  name: z.string().max(200),
  role: z.enum(['header', 'footer']),
  rootId: nodeIdSchema,
});

export const SYMBOL_CATEGORIES = [
  'structure',
  'hero',
  'presentation',
  'features',
  'testimonials',
  'pricing',
  'team',
  'gallery',
  'cta',
  'contact',
  'elements',
] as const;

/**
 * Shared component definition (CS-01, CS-03, ADR-0011): a root of the node table edited like a page;
 * `params` expose properties of its nodes (child-index path from the root) to the instances.
 */
export const symbolSchema = z.strictObject({
  id: entityIdSchema,
  name: z.string().min(1).max(120),
  category: z.enum(SYMBOL_CATEGORIES),
  description: z.string().max(300),
  version: z.number().int().min(1),
  rootId: nodeIdSchema,
  params: z
    .array(
      z.strictObject({
        id: paramIdSchema,
        label: z.string().min(1).max(120),
        path: z.array(z.number().int().min(0)).max(32),
        prop: z.string().regex(/^[a-zA-Z][a-zA-Z0-9]{0,63}$/),
      }),
    )
    .max(100),
});

/** Named menu (SB-03): entries link to pages (by id) or URLs; one level of sub-entries. */
const menuEntry = { id: entityIdSchema, label: z.string().min(1).max(120), link: linkSchema };
export const menuItemSchema = z.strictObject({
  ...menuEntry,
  children: z.array(z.strictObject(menuEntry)).max(50).optional(),
});
export const menuSchema = z.strictObject({
  id: entityIdSchema,
  name: z.string().max(200),
  items: z.array(menuItemSchema).max(50),
});

/**
 * Whole site (ADR-0007): one node table shared by every page, each page
 * pointing to its root. Breakpoints and assets are site-wide.
 */
export const siteSchema = z.strictObject({
  schemaVersion: z.literal(SCHEMA_VERSION),
  kind: z.literal('ns.site'),
  id: entityIdSchema,
  name: z.string().max(200),
  settings: z.strictObject({
    lang: z.string().regex(/^[a-z]{2,3}(?:-[A-Z]{2})?$/, 'schema.lang' satisfies MessageKey),
    homePageId: entityIdSchema,
    /** Canonical origin of the published site (SB-01), e.g. https://example.com. */
    siteUrl: z
      .string()
      .max(200)
      .regex(/^https?:\/\/[a-z0-9.-]+(?::\d{1,5})?$/, 'schema.origin' satisfies MessageKey)
      .optional(),
    /** Header and footer of pages that do not choose their own. */
    defaultLayouts: layoutChoiceSchema.optional(),
  }),
  breakpoints: z.array(breakpointSchema).max(16),
  pages: z.array(pageSchema).min(1).max(500),
  nodes: z.record(nodeIdSchema, nodeSchema),
  assets: z.record(z.string(), assetSchema),
  /** Design tokens (ADR-0009); absent = none. */
  tokens: tokensSchema.optional(),
  layouts: z.array(layoutSchema).max(20).optional(),
  menus: z.array(menuSchema).max(20).optional(),
  redirects: z.array(redirectSchema).max(500).optional(),
  symbols: z.array(symbolSchema).max(200).optional(),
  /** Project stylesheet (ADR-0023), as typed; checked by `checkCustomCss`, published from its output. */
  customCss: z.string().max(CUSTOM_CSS_MAX).optional(),
});

export type Breakpoint = z.infer<typeof breakpointSchema>;
export type DocNode = z.infer<typeof nodeSchema>;
export type Asset = z.infer<typeof assetSchema>;
export type AssetKind = Asset['kind'];
export type Page = z.infer<typeof pageSchema>;
export type Site = z.infer<typeof siteSchema>;
export type Layout = z.infer<typeof layoutSchema>;
export type LayoutRole = Layout['role'];
export type Menu = z.infer<typeof menuSchema>;
export type SiteSymbol = z.infer<typeof symbolSchema>;
export type SymbolCategory = SiteSymbol['category'];
export type MenuItem = z.infer<typeof menuItemSchema>;

export const nodeClass = (id: string) => `ns-${id}`;
/** Class attribute of a node: its generated class, then its custom classes (ADR-0023). */
export const nodeClassName = (node: Pick<DocNode, 'id' | 'classes'>) =>
  [nodeClass(node.id), ...(node.classes ?? [])].join(' ');

export const pageById = (site: Site, id: string) => site.pages.find((p) => p.id === id);
export const layoutById = (site: Site, id: string) => site.layouts?.find((l) => l.id === id);
export const symbolById = (site: Site, id: string) => site.symbols?.find((s) => s.id === id);
/** Root edited for a page, a layout or a shared component definition. */
export const editedRoot = (site: Site, id: string) =>
  (pageById(site, id) ?? layoutById(site, id) ?? symbolById(site, id))?.rootId;

/** Node at a child-index path from `rootId` (component parameters). */
export function nodeAtPath(site: Site, rootId: string, path: readonly number[]) {
  let node = site.nodes[rootId];
  for (const i of path) node = node && site.nodes[node.children[i] ?? ''];
  return node;
}

/** Layout shown with a page for `role`: the page's choice, else the site default; null = none. */
export function pageLayout(site: Site, pageId: string, role: LayoutRole): Layout | undefined {
  const choice = pageById(site, pageId)?.layouts?.[role];
  const id = choice === undefined ? site.settings.defaultLayouts?.[role] : choice;
  const layout = id ? layoutById(site, id) : undefined;
  return layout?.role === role ? layout : undefined;
}

/** Node ids of the subtree rooted at `id`, in document order. */
export function subtree(site: Site, id: string): string[] {
  const node = site.nodes[id];
  return node ? [id, ...node.children.flatMap((c) => subtree(site, c))] : [];
}
