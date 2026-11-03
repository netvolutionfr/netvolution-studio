import { z } from 'zod';

const unit = z.enum(['px', 'rem', 'em', '%', 'vw', 'vh']);
export const lengthSchema = z.strictObject({ value: z.number().min(-10000).max(10000), unit });
export const positiveLengthSchema = z.strictObject({ value: z.number().min(0).max(10000), unit });
export const colorSchema = z
  .string()
  .regex(/^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i, 'expected #rgb, #rrggbb or #rrggbbaa');

/** Design token id (ADR-0009); stable, the label is what users rename. */
export const tokenIdSchema = z.string().regex(/^[a-z][a-z0-9-]{0,31}$/);
/** Reference to a design token instead of a literal value. */
export const tokenRefSchema = z.strictObject({ token: tokenIdSchema });
export type TokenRef = z.infer<typeof tokenRefSchema>;
export const isTokenRef = (v: unknown): v is TokenRef =>
  typeof v === 'object' && v !== null && typeof (v as { token?: unknown }).token === 'string';

const positiveLength = z.union([positiveLengthSchema, tokenRefSchema]);
const lengthOrAuto = z.union([lengthSchema, z.literal('auto'), tokenRefSchema]);
const paddingLength = positiveLength;
const color = z.union([colorSchema, tokenRefSchema]);
const alignment = z.enum(['stretch', 'start', 'center', 'end', 'baseline']);
/** One box shadow, in structured values (ADR-0017); `none` overrides an inherited one. */
export const shadowSchema = z.strictObject({
  x: lengthSchema,
  y: lengthSchema,
  blur: positiveLengthSchema,
  spread: lengthSchema,
  color: colorSchema,
  inset: z.boolean().optional(),
});
export type Shadow = z.infer<typeof shadowSchema>;
/** Linear or radial gradient, 2 to 4 literal colors (ADR-0017). */
export const gradientSchema = z.strictObject({
  kind: z.enum(['linear', 'radial']),
  /** Direction of a linear gradient, in degrees (180: top to bottom). */
  angle: z.number().int().min(0).max(360),
  stops: z
    .array(z.strictObject({ color: colorSchema, at: z.number().int().min(0).max(100) }))
    .min(2)
    .max(4),
});
export type Gradient = z.infer<typeof gradientSchema>;
/** Background image: a media of the site, never a free URL (ADR-0017). */
export const backgroundImageSchema = z.strictObject({
  asset: z.string().regex(/^a[a-z0-9]{8,32}$/),
  size: z.enum(['cover', 'contain', 'auto']),
  position: z.enum(['center', 'top', 'bottom', 'left', 'right']),
});
export type BackgroundImage = z.infer<typeof backgroundImageSchema>;

/**
 * Typed whitelist of style properties. Values are structured, never raw CSS,
 * so a document cannot inject CSS. Key order is also the CSS emission order.
 */
export const styleDeclsSchema = z.strictObject({
  paddingTop: paddingLength.optional(),
  paddingRight: paddingLength.optional(),
  paddingBottom: paddingLength.optional(),
  paddingLeft: paddingLength.optional(),
  marginTop: lengthOrAuto.optional(),
  marginRight: lengthOrAuto.optional(),
  marginBottom: lengthOrAuto.optional(),
  marginLeft: lengthOrAuto.optional(),
  width: z.union([positiveLength, z.literal('auto')]).optional(),
  maxWidth: positiveLength.optional(),
  height: z.union([positiveLength, z.literal('auto')]).optional(),
  minHeight: positiveLength.optional(),
  direction: z.enum(['row', 'column', 'row-reverse', 'column-reverse']).optional(),
  justify: z.enum(['start', 'center', 'end', 'space-between', 'space-around', 'space-evenly']).optional(),
  align: alignment.optional(),
  wrap: z.boolean().optional(),
  gap: positiveLength.optional(),
  columns: z.number().int().min(1).max(12).optional(),
  grow: z.number().min(0).max(100).optional(),
  basis: z.union([positiveLength, z.literal('auto')]).optional(),
  alignSelf: z.enum(['auto', 'stretch', 'start', 'center', 'end']).optional(),
  /** Text style token: its font properties, before the local ones (ADR-0009). */
  textStyle: tokenRefSchema.optional(),
  fontFamily: tokenRefSchema.optional(),
  fontSize: positiveLength.optional(),
  fontWeight: z.number().int().min(100).max(900).multipleOf(100).optional(),
  lineHeight: z.number().min(0.5).max(4).optional(),
  /** Fine typography: tracking (negative allowed), case and italics. */
  letterSpacing: lengthSchema.optional(),
  textTransform: z.enum(['none', 'uppercase', 'lowercase', 'capitalize']).optional(),
  fontStyle: z.enum(['normal', 'italic']).optional(),
  /** Text filled with a gradient (ADR-0020); `none` removes an inherited one. */
  textGradient: z.union([z.literal('none'), gradientSchema]).optional(),
  textAlign: z.enum(['start', 'center', 'end', 'justify']).optional(),
  color: color.optional(),
  backgroundColor: color.optional(),
  /** Drawn over the background image (an overlay on a photo); `none` removes an inherited one. */
  gradient: z.union([z.literal('none'), gradientSchema]).optional(),
  backgroundImage: z.union([z.literal('none'), backgroundImageSchema]).optional(),
  radius: positiveLength.optional(),
  borderWidth: positiveLength.optional(),
  borderStyle: z.enum(['solid', 'dashed', 'dotted', 'double', 'none']).optional(),
  borderColor: color.optional(),
  shadow: z.union([z.literal('none'), shadowSchema]).optional(),
  hidden: z.boolean().optional(),
  // Advanced composition (CS-04): structured flow stays the default; absolute only inside a positioned parent.
  position: z.enum(['static', 'relative', 'absolute', 'sticky']).optional(),
  top: lengthOrAuto.optional(),
  right: lengthOrAuto.optional(),
  bottom: lengthOrAuto.optional(),
  left: lengthOrAuto.optional(),
  zIndex: z.number().int().min(-10).max(1000).optional(),
  overflow: z.enum(['visible', 'hidden', 'auto', 'clip']).optional(),
  /** Individual transform properties: they compose with the `transform` of hover/focus animations. */
  translate: z.strictObject({ x: lengthSchema, y: lengthSchema }).optional(),
  rotate: z.number().min(-360).max(360).optional(),
  scale: z.number().min(0).max(10).optional(),
  aspectRatio: z.enum(['1/1', '4/3', '3/2', '16/9', '21/9', '3/4', '2/3', '9/16']).optional(),
  objectPosition: z.enum(['center', 'top', 'bottom', 'left', 'right']).optional(),
});

export type Length = z.infer<typeof lengthSchema>;
export type Color = z.infer<typeof colorSchema>;
export type StyleDecls = z.infer<typeof styleDeclsSchema>;
export type StyleProperty = keyof StyleDecls;
/** `base` (widest, desktop-first) or a breakpoint id. */
export type ResponsiveStyle = Record<string, StyleDecls>;

export const STYLE_GROUPS = {
  spacing: [
    'paddingTop',
    'paddingRight',
    'paddingBottom',
    'paddingLeft',
    'marginTop',
    'marginRight',
    'marginBottom',
    'marginLeft',
  ],
  size: ['width', 'maxWidth', 'height', 'minHeight', 'aspectRatio'],
  flex: ['direction', 'justify', 'align', 'wrap', 'gap'],
  grid: ['columns', 'gap', 'align'],
  item: ['grow', 'basis', 'alignSelf'],
  typography: [
    'textStyle',
    'fontFamily',
    'fontSize',
    'fontWeight',
    'lineHeight',
    'letterSpacing',
    'textTransform',
    'fontStyle',
    'textGradient',
    'textAlign',
    'color',
  ],
  background: [
    'backgroundColor',
    'gradient',
    'backgroundImage',
    'radius',
    'borderWidth',
    'borderStyle',
    'borderColor',
    'shadow',
  ],
  visibility: ['hidden'],
  position: ['position', 'top', 'right', 'bottom', 'left', 'zIndex'],
  effects: ['overflow', 'translate', 'rotate', 'scale'],
  media: ['objectPosition'],
} as const satisfies Record<string, readonly StyleProperty[]>;

export type StyleGroup = keyof typeof STYLE_GROUPS;

/** Media used as background images by a node, on any breakpoint (ADR-0017). */
export const backgroundAssets = (style: ResponsiveStyle): string[] =>
  Object.values(style).flatMap((d) =>
    d.backgroundImage && d.backgroundImage !== 'none' ? [d.backgroundImage.asset] : [],
  );
