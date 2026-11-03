// Kit for the built-in site templates written in code (CS-02): a declarative tree becomes a site
// validated by the Studio's own model (loadSite, checkSite), with deterministic ids, generated SVG
// visuals and fonts from the catalog (ADR-0018). Original designs: nothing comes from Tatsu/Oshine.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { registry } from '@ns/components/definitions';
import {
  type Animation,
  type Asset,
  checkSite,
  loadSite,
  localizeContent,
  type ResponsiveStyle,
  type Site,
  type StyleDecls,
  type Tokens,
  tm,
} from '@ns/core';

const repo = join(import.meta.dirname, '..');

/** A node of a template: a component, its props (over the defaults), style, animations, children. */
export type T = {
  type: string;
  name?: string;
  props?: Record<string, unknown>;
  style?: ResponsiveStyle;
  anim?: Animation[];
  children?: T[];
};

export const px = (value: number) => ({ value, unit: 'px' as const });
export const pct = (value: number) => ({ value, unit: '%' as const });
export const tok = (token: string) => ({ token });
/** Responsive style: base (desktop), then tablet and mobile overrides. */
export const st = (base: StyleDecls, tablet?: StyleDecls, mobile?: StyleDecls): ResponsiveStyle => ({
  base,
  ...(tablet && { tablet }),
  ...(mobile && { mobile }),
});
export const pad = (y: number, x: number) => ({
  paddingTop: px(y),
  paddingBottom: px(y),
  paddingLeft: px(x),
  paddingRight: px(x),
});
export const center = (max: number): StyleDecls => ({
  maxWidth: px(max),
  marginLeft: 'auto',
  marginRight: 'auto',
});

// Shorthands for the components.
export const h = (level: number, text: string, style?: ResponsiveStyle, name?: string): T => ({
  type: 'heading',
  props: { level, text },
  ...(style && { style }),
  ...(name && { name }),
});
type Run = { text: string; bold?: boolean; italic?: boolean };
export const p = (content: string | Run[], style?: ResponsiveStyle): T => ({
  type: 'text',
  props: { content: typeof content === 'string' ? [{ text: content }] : content },
  ...(style && { style }),
});
export type LinkTo = { page: string } | { url: string };
const link = (to: LinkTo) =>
  'page' in to ? { kind: 'page', pageId: to.page } : { kind: 'url', href: to.url };
export const btn = (
  label: string,
  to: LinkTo,
  variant: 'primary' | 'secondary' | 'text',
  style?: ResponsiveStyle,
): T => ({ type: 'button', props: { label, link: link(to), variant }, ...(style && { style }) });
export const icon = (name: string, style?: ResponsiveStyle): T => ({
  type: 'icon',
  props: { name, label: '' },
  ...(style && { style }),
});
export const img = (
  assetId: string,
  alt: string,
  style?: ResponsiveStyle,
  extra: Record<string, unknown> = {},
): T => ({
  type: 'image',
  props: { assetId, alt, decorative: alt === '', ...extra },
  ...(style && { style }),
});
export const list = (items: string[], marker = 'disc', style?: ResponsiveStyle): T => ({
  type: 'list',
  props: { marker, items: items.map((text) => [{ text }]) },
  ...(style && { style }),
});
export const box = (
  type: 'container' | 'stack' | 'grid',
  name: string,
  style: ResponsiveStyle,
  children: T[],
  extra: Partial<T> = {},
): T => ({
  type,
  name,
  style,
  children,
  ...extra,
});

/** Entrance on scroll, children one after the other (stagger) when `stagger` is set. */
export const reveal = (y = 24, stagger?: number): Animation[] => [
  {
    trigger: 'inView',
    effect: { opacity: 0, y },
    duration: 700,
    delay: 0,
    easing: 'ease-out',
    iterations: 1,
    direction: 'normal',
    ...(stagger !== undefined && { stagger }),
  },
];
/** Lift on hover and keyboard focus. */
export const lift: Animation[] = (['hover', 'focus'] as const).map((trigger) => ({
  trigger,
  effect: { y: -6 },
  duration: 200,
  delay: 0,
  easing: 'ease-out',
  iterations: 1,
  direction: 'normal',
}));

export type Media = {
  id: string;
  file: string;
  svg: string;
  width: number;
  height: number;
  name: string;
  alt: string;
};

export type TemplateSpec = {
  id: string;
  name: string;
  description: string;
  siteUrl: string;
  /** Node id prefix (n + 3 letters): ids stay stable from one build to the next. */
  prefix: string;
  tokens: Tokens;
  /** Catalog fonts (fonts/catalog.json ids) bundled with the template. */
  fonts: string[];
  media: Media[];
  menus: Site['menus'];
  header: T;
  footer: T;
  pages: { id: string; title: string; slug: string; description: string; tree: T }[];
};

type CatalogFont = {
  id: string;
  family: string;
  license: string;
  files: { file: string; weight: { min: number; max: number }; style: 'normal' | 'italic' }[];
};

/** Builds the template archive (format of « Exporter l'archive »), validated like any site. */
export function buildTemplate(spec: TemplateSpec) {
  const nodes: Site['nodes'] = {};
  let next = 0;
  const add = (t: T): string => {
    next += 1;
    const id = `${spec.prefix}${String(next).padStart(6, '0')}`;
    const def = registry.get(t.type);
    if (!def) throw new Error(`${spec.id} : type inconnu ${t.type}`);
    const children = (t.children ?? []).map(add);
    nodes[id] = {
      id,
      type: t.type,
      ...(t.name && { name: t.name }),
      // ponytail: the built-in templates are French (lang: 'fr' below) until their English versions (ADR-0024, lot 3).
      props: localizeContent({ ...def.defaults.props, ...t.props }, 'fr'),
      style: t.style ?? {},
      children,
      ...(t.anim && { animations: t.anim }),
    } as Site['nodes'][string];
    return id;
  };

  const media: Record<string, string> = {};
  const assets: Record<string, Asset> = {};
  for (const m of spec.media) {
    media[m.file] = Buffer.from(m.svg).toString('base64');
    assets[m.id] = {
      id: m.id,
      file: m.file,
      kind: 'svg',
      mime: 'image/svg+xml',
      width: m.width,
      height: m.height,
      name: m.name,
      ...(m.alt && { alt: m.alt }),
    };
  }
  const catalog = JSON.parse(readFileSync(join(repo, 'fonts/catalog.json'), 'utf8')) as CatalogFont[];
  for (const fontId of spec.fonts) {
    const font = catalog.find((f) => f.id === fontId);
    if (!font) throw new Error(`${spec.id} : police absente du catalogue ${fontId}`);
    font.files.forEach((f, i) => {
      const id = `a${spec.id.slice(0, 6).replace(/-/g, '')}${fontId.replace(/-/g, '').slice(0, 10)}${i}`;
      const file = `${id}.woff2`;
      const content = readFileSync(join(repo, 'fonts/files', f.file));
      media[file] = content.toString('base64');
      assets[id] = {
        id,
        file,
        name: f.file,
        kind: 'font',
        mime: 'font/woff2',
        size: content.length,
        family: font.family,
        weight: f.weight,
        style: f.style,
        license: font.license,
      };
    });
  }

  const header = add(spec.header);
  const footer = add(spec.footer);
  const pages = spec.pages.map((pg) => ({
    id: pg.id,
    title: pg.title,
    slug: pg.slug,
    rootId: add(pg.tree),
    publish: true,
    seo: { description: pg.description },
  }));
  const site = {
    schemaVersion: 2,
    kind: 'ns.site',
    id: spec.id,
    name: spec.name,
    settings: {
      lang: 'fr',
      homePageId: pages[0]?.id,
      siteUrl: spec.siteUrl,
      defaultLayouts: { header: 'header', footer: 'footer' },
    },
    breakpoints: [
      { id: 'tablet', label: 'Tablette', maxWidth: 1023 },
      { id: 'mobile', label: 'Mobile', maxWidth: 767 },
    ],
    pages,
    layouts: [
      { id: 'header', name: 'Header', role: 'header', rootId: header },
      { id: 'footer', name: 'Footer', role: 'footer', rootId: footer },
    ],
    nodes,
    assets,
    tokens: spec.tokens,
    menus: spec.menus,
  };

  const loaded = loadSite(site, registry);
  if (!loaded.ok) throw new Error(`${spec.id} invalide :\n${JSON.stringify(loaded.diagnostics, null, 2)}`);
  const { checks } = checkSite(loaded.doc, registry, new Set(Object.keys(media)));
  const errors = checks.filter((c) => c.severity === 'error');
  if (errors.length) throw new Error(`${spec.id} : ${errors.map((c) => tm(c.message)).join(' ; ')}`);
  return {
    archive: {
      format: 'ns.archive',
      version: 1,
      site: loaded.doc,
      media,
      template: { name: spec.name, description: spec.description },
    },
    warnings: checks.map((c) => tm(c.message)),
  };
}
