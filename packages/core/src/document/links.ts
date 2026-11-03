import { z } from 'zod';
import type { MessageKey } from '../i18n/index.ts';
import { entityIdSchema } from './ids.ts';
import type { Site } from './schema.ts';

/** Allowed link targets: http(s), mailto, tel and in-page anchors. Never `javascript:` or `data:`. */
export const hrefSchema = z
  .string()
  .max(2000)
  .regex(
    /^(?:https?:\/\/[^\s<>"]+|mailto:[^\s<>"]+|tel:[+0-9 ().-]+|#[A-Za-z0-9_-]*)$/,
    'schema.url' satisfies MessageKey,
  );

/** External URL, or a reference to a page of the site that follows its slug (SB-03). */
export const linkSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('url'), href: hrefSchema }),
  z.strictObject({ kind: z.literal('page'), pageId: entityIdSchema }),
  /** A media of the library, typically a downloadable file. */
  z.strictObject({ kind: z.literal('asset'), assetId: z.string().regex(/^a[a-z0-9]{8,32}$/) }),
]);
export type Link = z.infer<typeof linkSchema>;

/** Public path of a page: `/` for the home page, `/<slug>/` otherwise (Astro directory format). */
export const pagePath = (slug: string) => (slug ? `/${slug}/` : '/');

/** Public URL prefix of media files in exported sites. */
export const MEDIA_PATH = '/media/';

/**
 * href of a link; a link to a missing page or media (rejected by `loadSite`) falls back to `#`.
 * `base` prefixes page paths (the Studio's site preview); `mediaBase` the media files.
 */
export function linkHref(link: Link, site: Site, base = '', mediaBase = MEDIA_PATH): string {
  if (link.kind === 'url') return link.href;
  if (link.kind === 'asset') {
    const asset = site.assets[link.assetId];
    return asset ? `${mediaBase}${asset.file}` : '#';
  }
  const page = site.pages.find((p) => p.id === link.pageId);
  return page ? `${base}${pagePath(page.slug)}` : '#';
}

/** Targets of the links of `kind` anywhere in a value (node props, menus). */
function linkTargets(value: unknown, kind: 'page' | 'asset', key: 'pageId' | 'assetId'): string[] {
  if (Array.isArray(value)) return value.flatMap((v) => linkTargets(v, kind, key));
  if (typeof value !== 'object' || value === null) return [];
  const o = value as Record<string, unknown>;
  if (o.kind === kind && typeof o[key] === 'string') return [o[key] as string];
  return Object.values(o).flatMap((v) => linkTargets(v, kind, key));
}
/** Page ids referenced by page links anywhere in a value. */
export const pageLinkTargets = (value: unknown) => linkTargets(value, 'page', 'pageId');
/** Asset ids referenced by media links anywhere in a value. */
export const assetLinkTargets = (value: unknown) => linkTargets(value, 'asset', 'assetId');
