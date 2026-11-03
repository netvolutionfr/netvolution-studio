import { colorSchema, linkHref, linkSchema, type RenderContext } from '@ns/core';
import { z } from 'zod';

/**
 * A run of rich text (ADR-0020): bold, italic, a literal color, a validated link. Line breaks are
 * `\n` in the text (ADR-0019). Shared by Text, Heading and List; views get `href` instead of `link`.
 */
export const inlineSchema = z.strictObject({
  text: z.string().min(1).max(5000),
  bold: z.boolean().optional(),
  italic: z.boolean().optional(),
  color: colorSchema.optional(),
  link: linkSchema.optional(),
});
export type Inline = z.infer<typeof inlineSchema>;
export const runsSchema = z.array(inlineSchema).min(1).max(200);

export const resolveRuns = (runs: readonly Inline[], { site, basePath, mediaBase }: RenderContext) =>
  runs.map(({ link, ...run }) => (link ? { ...run, href: linkHref(link, site, basePath, mediaBase) } : run));
