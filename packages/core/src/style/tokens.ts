import { z } from 'zod';
import type { MessageKey } from '../i18n/index.ts';
import { colorSchema, isTokenRef, positiveLengthSchema, styleDeclsSchema, tokenIdSchema } from './schema.ts';

const label = z.string().min(1).max(80);
const breakpointKey = z.string().regex(/^(?:base|[a-z][a-z0-9-]{0,31})$/);
/** Generic CSS families are emitted unquoted, other names quoted. */
export const GENERIC_FAMILIES = new Set([
  'serif',
  'sans-serif',
  'monospace',
  'cursive',
  'fantasy',
  'system-ui',
  'ui-serif',
  'ui-sans-serif',
  'ui-monospace',
  'ui-rounded',
]);
export const familyNameSchema = z
  .string()
  .regex(/^[A-Za-z0-9 _-]{1,60}$/, 'schema.fontName' satisfies MessageKey);

export const textStyleDeclsSchema = styleDeclsSchema.pick({
  fontFamily: true,
  fontSize: true,
  fontWeight: true,
  lineHeight: true,
  letterSpacing: true,
  textTransform: true,
  fontStyle: true,
});

/** Site design tokens (SB-05, ADR-0009). Responsive values: `base` plus breakpoint overrides. */
export const tokensSchema = z.strictObject({
  colors: z.record(tokenIdSchema, z.strictObject({ label, value: colorSchema })),
  sizes: z.record(
    tokenIdSchema,
    z.strictObject({
      label,
      group: z.enum(['spacing', 'radius', 'width', 'font']),
      value: z.strictObject({ base: positiveLengthSchema }).catchall(positiveLengthSchema),
    }),
  ),
  fonts: z.record(tokenIdSchema, z.strictObject({ label, stack: z.array(familyNameSchema).min(1).max(10) })),
  textStyles: z.record(
    tokenIdSchema,
    z.strictObject({ label, style: z.record(breakpointKey, textStyleDeclsSchema) }),
  ),
});
export type Tokens = z.infer<typeof tokensSchema>;
export type TokenKind = keyof Tokens;
export const TOKEN_KINDS = ['colors', 'sizes', 'fonts', 'textStyles'] as const satisfies readonly TokenKind[];
export const EMPTY_TOKENS: Tokens = { colors: {}, sizes: {}, fonts: {}, textStyles: {} };

/** Token category referenced by a style property. */
export const tokenKindOf = (prop: string): TokenKind =>
  prop === 'color' || prop === 'backgroundColor' || prop === 'borderColor'
    ? 'colors'
    : prop === 'fontFamily'
      ? 'fonts'
      : prop === 'textStyle'
        ? 'textStyles'
        : 'sizes';

/** Token references in a declaration block. */
export const tokenRefs = (decls: Record<string, unknown>) =>
  Object.entries(decls).flatMap(([prop, v]) =>
    isTokenRef(v) ? [{ prop, kind: tokenKindOf(prop), id: v.token }] : [],
  );
