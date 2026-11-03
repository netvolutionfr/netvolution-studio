import { type AnimationConfig, interactionCss, isEntrance } from '../document/animations.ts';
import { MEDIA_PATH } from '../document/links.ts';
import { editedRoot, nodeClass, pageById, pageLayout, type Site, subtree } from '../document/schema.ts';
import type { Display, Registry } from '../registry/registry.ts';
import { CSS_LAYERS } from './custom.ts';
import {
  type Color,
  type Gradient,
  isTokenRef,
  type Length,
  type StyleDecls,
  type TokenRef,
} from './schema.ts';
import { EMPTY_TOKENS, GENERIC_FAMILIES, type Tokens } from './tokens.ts';

type Ctx = {
  display: Display;
  tokens: Tokens;
  /** For background images: the site's media and where they are served. */
  assets: Site['assets'];
  mediaBase: string;
  /** The block being emitted, and the effective style at its breakpoint (background layers). */
  decls: StyleDecls;
  resolved: StyleDecls;
};
type Emitters = { [K in keyof StyleDecls]-?: (v: NonNullable<StyleDecls[K]>, ctx: Ctx) => string };

// Token references become CSS variables (ADR-0009): editing a token changes one variable.
const len = (v: Length | 'auto' | TokenRef) =>
  v === 'auto' ? 'auto' : isTokenRef(v) ? `var(--ns-size-${v.token})` : `${v.value}${v.unit}`;
const col = (v: Color | TokenRef) => (isTokenRef(v) ? `var(--ns-color-${v.token})` : v);

const TEXT_PROPS = {
  fontFamily: 'font-family',
  fontSize: 'font-size',
  fontWeight: 'font-weight',
  lineHeight: 'line-height',
  letterSpacing: 'letter-spacing',
  textTransform: 'text-transform',
  fontStyle: 'font-style',
} as const;
type TextProp = keyof typeof TEXT_PROPS;

/** Declarations applying text style `id`: one variable per property it defines on any breakpoint. */
function textStyleDecls(tokens: Tokens, id: string): string {
  const style = tokens.textStyles[id]?.style ?? {};
  const props = new Set(Object.values(style).flatMap((d) => Object.keys(d) as TextProp[]));
  return (Object.keys(TEXT_PROPS) as TextProp[])
    .filter((p) => props.has(p))
    .map((p) => `${TEXT_PROPS[p]}:var(--ns-text-${id}-${TEXT_PROPS[p]})`)
    .join(';');
}

const gradientCss = (g: Gradient) => {
  const stops = g.stops.map((s) => `${s.color} ${s.at}%`).join(',');
  return g.kind === 'linear' ? `linear-gradient(${g.angle}deg,${stops})` : `radial-gradient(circle,${stops})`;
};
/**
 * One `background-image` for both layers (ADR-0017), from the effective values at the breakpoint:
 * a breakpoint changing only the gradient keeps the inherited image, and the reverse.
 */
function backgroundLayers({ resolved, assets, mediaBase }: Ctx) {
  const { gradient: g, backgroundImage: i } = resolved;
  const file = i && i !== 'none' ? assets[i.asset]?.file : undefined;
  const layers = [g && g !== 'none' ? gradientCss(g) : '', file ? `url("${mediaBase}${file}")` : ''];
  return `background-image:${layers.filter(Boolean).join(',') || 'none'}`;
}

// Literal key order = emission order, so output is deterministic.
const EMIT: Emitters = {
  paddingTop: (v) => `padding-top:${len(v)}`,
  paddingRight: (v) => `padding-right:${len(v)}`,
  paddingBottom: (v) => `padding-bottom:${len(v)}`,
  paddingLeft: (v) => `padding-left:${len(v)}`,
  marginTop: (v) => `margin-top:${len(v)}`,
  marginRight: (v) => `margin-right:${len(v)}`,
  marginBottom: (v) => `margin-bottom:${len(v)}`,
  marginLeft: (v) => `margin-left:${len(v)}`,
  width: (v) => `width:${len(v)}`,
  maxWidth: (v) => `max-width:${len(v)}`,
  height: (v) => `height:${len(v)}`,
  minHeight: (v) => `min-height:${len(v)}`,
  direction: (v) => `flex-direction:${v}`,
  justify: (v) => `justify-content:${v}`,
  align: (v) => `align-items:${v}`,
  wrap: (v) => `flex-wrap:${v ? 'wrap' : 'nowrap'}`,
  // A block component with columns is a CSS multi-column layout (gallery mosaic): the gap is
  // also exposed to its items, which space themselves vertically with it.
  gap: (v, { display }) =>
    display === 'block' ? `column-gap:${len(v)};--ns-gap:${len(v)}` : `gap:${len(v)}`,
  columns: (v, { display }) =>
    display === 'block' ? `column-count:${v}` : `grid-template-columns:repeat(${v},minmax(0,1fr))`,
  grow: (v) => `flex-grow:${v}`,
  basis: (v) => `flex-basis:${len(v)}`,
  alignSelf: (v) => `align-self:${v}`,
  textStyle: (v, { tokens }) => textStyleDecls(tokens, v.token),
  fontFamily: (v) => `font-family:var(--ns-font-${v.token})`,
  fontSize: (v) => `font-size:${len(v)}`,
  fontWeight: (v) => `font-weight:${v}`,
  lineHeight: (v) => `line-height:${v}`,
  letterSpacing: (v) => `letter-spacing:${len(v)}`,
  textTransform: (v) => `text-transform:${v}`,
  fontStyle: (v) => `font-style:${v}`,
  textGradient: (v) =>
    v === 'none'
      ? 'background-image:none;-webkit-text-fill-color:currentcolor'
      : `background-image:${gradientCss(v)};-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent`,
  textAlign: (v) => `text-align:${v}`,
  color: (v) => `color:${col(v)}`,
  backgroundColor: (v) => `background-color:${col(v)}`,
  gradient: (_, ctx) => backgroundLayers(ctx),
  backgroundImage: (v, ctx) =>
    [
      ctx.decls.gradient === undefined ? backgroundLayers(ctx) : '',
      v === 'none'
        ? ''
        : `background-size:${v.size};background-position:${v.position};background-repeat:no-repeat`,
    ]
      .filter(Boolean)
      .join(';'),
  radius: (v) => `border-radius:${len(v)}`,
  borderWidth: (v) => `border-width:${len(v)}`,
  borderStyle: (v) => `border-style:${v}`,
  borderColor: (v) => `border-color:${col(v)}`,
  shadow: (v) =>
    `box-shadow:${v === 'none' ? 'none' : `${v.inset ? 'inset ' : ''}${[v.x, v.y, v.blur, v.spread].map(len).join(' ')} ${v.color}`}`,
  hidden: (v, { display }) => `display:${v ? 'none' : display}`,
  position: (v) => `position:${v}`,
  top: (v) => `top:${len(v)}`,
  right: (v) => `right:${len(v)}`,
  bottom: (v) => `bottom:${len(v)}`,
  left: (v) => `left:${len(v)}`,
  zIndex: (v) => `z-index:${v}`,
  overflow: (v) => `overflow:${v}`,
  translate: (v) => `translate:${len(v.x)} ${len(v.y)}`,
  rotate: (v) => `rotate:${v}deg`,
  scale: (v) => `scale:${v}`,
  aspectRatio: (v) => `aspect-ratio:${v.replace('/', ' / ')}`,
  objectPosition: (v) => `object-position:${v}`,
};
const ORDER = Object.keys(EMIT) as (keyof StyleDecls)[];

export const BASE_CSS =
  '*,*::before,*::after{box-sizing:border-box}' +
  'body{margin:0;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;line-height:1.5;color:#111827}' +
  'h1,h2,h3,h4,h5,h6,p{margin:0}h1,h2,h3,h4,h5,h6{line-height:1.2}img{display:block;max-width:100%;height:auto}';

export function declsToCss(
  decls: StyleDecls,
  display: Display,
  tokens: Tokens = EMPTY_TOKENS,
  /** Background images: the site's media, where they are served, and the effective style. */
  background: { assets?: Site['assets']; mediaBase?: string; resolved?: StyleDecls } = {},
): string {
  const ctx: Ctx = {
    display,
    tokens,
    assets: background.assets ?? {},
    mediaBase: background.mediaBase ?? MEDIA_PATH,
    decls,
    resolved: background.resolved ?? decls,
  };
  return ORDER.filter((k) => decls[k] !== undefined)
    .map((k) => (EMIT[k] as (v: unknown, c: Ctx) => string)(decls[k], ctx))
    .filter(Boolean)
    .join(';');
}

const family = (name: string) => (GENERIC_FAMILIES.has(name) ? name : `"${name}"`);
const sorted = <T>(record: Record<string, T>) =>
  Object.entries(record).sort(([a], [b]) => a.localeCompare(b));

/** Custom properties of the tokens at a breakpoint (`base`: every token, else responsive overrides). */
export function tokenVars(tokens: Tokens, bp: string): string {
  const vars: string[] = [];
  if (bp === 'base') {
    for (const [id, c] of sorted(tokens.colors)) vars.push(`--ns-color-${id}:${c.value}`);
    for (const [id, f] of sorted(tokens.fonts)) vars.push(`--ns-font-${id}:${f.stack.map(family).join(',')}`);
  }
  for (const [id, size] of sorted(tokens.sizes)) {
    const v = size.value[bp];
    if (v) vars.push(`--ns-size-${id}:${len(v)}`);
  }
  for (const [id, text] of sorted(tokens.textStyles)) {
    const d = text.style[bp] ?? {};
    const values: Record<TextProp, string | undefined> = {
      fontFamily: d.fontFamily && `var(--ns-font-${d.fontFamily.token})`,
      fontSize: d.fontSize && len(d.fontSize),
      fontWeight: d.fontWeight?.toString(),
      lineHeight: d.lineHeight?.toString(),
      letterSpacing: d.letterSpacing && len(d.letterSpacing),
      textTransform: d.textTransform,
      fontStyle: d.fontStyle,
    };
    for (const p of Object.keys(TEXT_PROPS) as TextProp[]) {
      if (values[p] !== undefined) vars.push(`--ns-text-${id}-${TEXT_PROPS[p]}:${values[p]}`);
    }
  }
  return vars.length ? `:root{${vars.join(';')}}` : '';
}

/** Text styles named `body` and `h1`…`h6` also style those elements (site defaults, ADR-0009). */
const ELEMENT_STYLES = ['body', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
const elementCss = (tokens: Tokens) =>
  ELEMENT_STYLES.filter((id) => tokens.textStyles[id])
    .map((id) => `${id}{${textStyleDecls(tokens, id)}}`)
    .join('');

/**
 * `@font-face` of the imported fonts (ADR-0018), served next to the other media under `mediaBase`.
 * Family and file names are validated by the schema, so they cannot break out of the CSS strings.
 */
export function fontFaces(doc: Site, mediaBase: string = MEDIA_PATH): string {
  return Object.values(doc.assets)
    .flatMap((a) =>
      a.kind === 'font'
        ? [
            `@font-face{font-family:"${a.family}";src:url("${mediaBase}${a.file}") format("woff2");` +
              `font-weight:${a.weight.min === a.weight.max ? a.weight.min : `${a.weight.min} ${a.weight.max}`};` +
              `font-style:${a.style};font-display:swap}`,
          ]
        : [],
    )
    .sort()
    .join('');
}

/** Breakpoints from widest to narrowest: the CSS cascade order. */
export const breakpointsByWidth = (doc: Site) => [...doc.breakpoints].sort((a, b) => b.maxWidth - a.maxWidth);

/**
 * Roots rendered for a page, in document order: header, page, footer (ADR-0007).
 * A layout or shared component id renders it alone (editing).
 */
export const pageRoots = (doc: Site, pageId: string): string[] => {
  const page = pageById(doc, pageId);
  if (!page) {
    const root = editedRoot(doc, pageId);
    return root ? [root] : [];
  }
  return [
    pageLayout(doc, pageId, 'header')?.rootId,
    page.rootId,
    pageLayout(doc, pageId, 'footer')?.rootId,
  ].filter((id): id is string => id !== undefined);
};

/**
 * Desktop-first stylesheet of the subtrees under `roots`: base rules, then one
 * `max-width` media query per breakpoint from widest to narrowest. A value
 * missing at a breakpoint is thus inherited from the nearest wider breakpoint
 * that sets it, else from base — the same rule as `resolveStyle`. Expects a
 * site validated by `loadSite`.
 */
export function toCss(
  doc: Site,
  registry: Registry,
  roots: readonly string[],
  /** Where the imported fonts are served; null leaves them out (thumbnails). */
  mediaBase: string | null = MEDIA_PATH,
): string {
  const bps = breakpointsByWidth(doc);
  const tokens = doc.tokens ?? EMPTY_TOKENS;
  const rules = new Map<string, string[]>([
    ['base', []],
    ...bps.map((b) => [b.id, []] as [string, string[]]),
  ]);
  const used = new Set<string>();
  let animated = false;
  const walk = (id: string) => {
    const node = doc.nodes[id];
    const def = node && registry.get(node.type);
    if (!node || !def) return;
    used.add(node.type);
    for (const [bp, list] of rules) {
      const decls = node.style[bp];
      const layered = decls && (decls.gradient !== undefined || decls.backgroundImage !== undefined);
      const body = decls
        ? declsToCss(decls, def.display, tokens, {
            assets: doc.assets,
            mediaBase: mediaBase ?? MEDIA_PATH,
            resolved: layered ? resolveStyle(doc, id, bp) : decls,
          })
        : '';
      if (body) list.push(`.${nodeClass(id)}{${body}}`);
      const extra = def.breakpointCss?.(node.props, `.${nodeClass(id)}`, bp);
      if (extra) list.push(extra);
      if (bp === 'base' && node.animations) {
        const interaction = interactionCss(`.${nodeClass(id)}`, node.animations);
        if (interaction) {
          list.push(interaction);
          animated = true;
        }
      }
    }
    node.children.forEach(walk);
  };
  roots.forEach(walk);
  const componentCss = [...used]
    .sort()
    .map((t) => registry.get(t)?.css ?? '')
    .join('');
  const media = bps
    .map((b) => [b, tokenVars(tokens, b.id) + (rules.get(b.id)?.join('') ?? '')] as const)
    .filter(([, body]) => body)
    .map(([b, body]) => `@media (max-width:${b.maxWidth}px){${body}}`);
  // Generated styles in their cascade layer (ADR-0023), under the project stylesheet's.
  return (
    CSS_LAYERS +
    '@layer ns{' +
    BASE_CSS +
    (mediaBase === null ? '' : fontFaces(doc, mediaBase)) +
    tokenVars(tokens, 'base') +
    elementCss(tokens) +
    componentCss +
    (rules.get('base')?.join('') ?? '') +
    media.join('') +
    // Reduced motion (CS-12): hover and focus states apply without transition.
    (animated ? '@media (prefers-reduced-motion:reduce){*{transition:none!important}}' : '') +
    '}'
  );
}

/** Breakpoint edited/applied at a viewport width: the narrowest one containing it, else `base`. */
export function activeBreakpoint(doc: Site, width: number): string {
  const match = [...doc.breakpoints].sort((a, b) => a.maxWidth - b.maxWidth).find((b) => width <= b.maxWidth);
  return match?.id ?? 'base';
}

/** Effective declarations at a breakpoint (or `base`), for the inspector's "inherited from" display. */
export function resolveStyle(doc: Site, nodeId: string, breakpoint: string): StyleDecls {
  const node = doc.nodes[nodeId];
  if (!node) return {};
  const target = doc.breakpoints.find((b) => b.id === breakpoint);
  const chain =
    breakpoint === 'base' || !target
      ? ['base']
      : [
          'base',
          ...breakpointsByWidth(doc)
            .filter((b) => b.maxWidth >= target.maxWidth)
            .map((b) => b.id),
        ];
  return Object.assign({}, ...chain.map((bp) => node.style[bp] ?? {}));
}

/** Entrance animations (load, in view, click) of the nodes under `roots`: the animation island's input. */
export function animationConfig(doc: Site, roots: readonly string[]): AnimationConfig {
  const config: AnimationConfig = {};
  for (const id of roots.flatMap((r) => subtree(doc, r))) {
    const entrances = doc.nodes[id]?.animations?.filter(isEntrance);
    if (entrances?.length) config[id] = entrances;
  }
  return config;
}
