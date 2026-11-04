// Media import policy (SB-06, ADR-0010): whitelisted types, content checked against the
// declared type, SVG accepted only when it passes a strict check (refusal, never rewriting).
import type { AssetKind, MessageKey } from '@ns/core';

type Kind = { kind: AssetKind; ext: string; sniff: (b: Buffer) => boolean; max: number };
const MB = 1024 * 1024;
const zip = (b: Buffer) => b.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]));

export const MEDIA_TYPES: Record<string, Kind> = {
  'image/png': {
    kind: 'image',
    ext: 'png',
    max: 10 * MB,
    sniff: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  'image/jpeg': {
    kind: 'image',
    ext: 'jpg',
    max: 10 * MB,
    sniff: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  'image/webp': {
    kind: 'image',
    ext: 'webp',
    max: 10 * MB,
    sniff: (b) => b.toString('latin1', 0, 4) === 'RIFF' && b.toString('latin1', 8, 12) === 'WEBP',
  },
  'image/avif': {
    kind: 'image',
    ext: 'avif',
    max: 10 * MB,
    sniff: (b) =>
      b.toString('latin1', 4, 8) === 'ftyp' && ['avif', 'avis'].includes(b.toString('latin1', 8, 12)),
  },
  'image/svg+xml': {
    kind: 'svg',
    ext: 'svg',
    max: 1 * MB,
    sniff: (b) => checkSvg(b.toString('utf8')) === null,
  },
  // Fonts (ADR-0018): woff2 only, self-hosted with the site.
  'font/woff2': {
    kind: 'font',
    ext: 'woff2',
    max: 2 * MB,
    sniff: (b) => b.toString('latin1', 0, 4) === 'wOF2',
  },
  'application/pdf': {
    kind: 'file',
    ext: 'pdf',
    max: 20 * MB,
    sniff: (b) => b.toString('latin1', 0, 5) === '%PDF-',
  },
  'application/zip': { kind: 'file', ext: 'zip', max: 20 * MB, sniff: zip },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
    kind: 'file',
    ext: 'docx',
    max: 20 * MB,
    sniff: zip,
  },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
    kind: 'file',
    ext: 'xlsx',
    max: 20 * MB,
    sniff: zip,
  },
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': {
    kind: 'file',
    ext: 'pptx',
    max: 20 * MB,
    sniff: zip,
  },
};
export const EXT_TYPE = Object.fromEntries(Object.entries(MEDIA_TYPES).map(([mime, t]) => [t.ext, mime]));
export const MEDIA_FILE = new RegExp(
  `^a[a-z0-9]{8,32}\\.(${Object.values(MEDIA_TYPES)
    .map((t) => t.ext)
    .join('|')})$`,
);
export const MAX_UPLOAD = 20 * MB;

const decodeEntities = (s: string) =>
  s
    .replace(/&#x([0-9a-f]+);?/gi, (_, h: string) => String.fromCodePoint(Number.parseInt(h, 16) % 0x110000))
    .replace(/&#(\d+);?/g, (_, d: string) => String.fromCodePoint(Number(d) % 0x110000));

/** Refused constructs, checked on the raw text and on its numeric-entity-decoded form. */
const FORBIDDEN: [RegExp, MessageKey][] = [
  [/<!DOCTYPE|<!ENTITY/i, 'svg.doctype'],
  // Namespace aliases can hide active SVG elements (`<s:script>`) or external href attributes.
  [/<\s*\/?\s*[a-z_][\w.-]*:/i, 'svg.active'],
  [/\s(?!(?:xlink:href|xmlns:xlink|xml:(?:lang|space))\s*=)[a-z_][\w.-]*:[\w.-]+\s*=/i, 'svg.active'],
  [/<\s*(script|foreignObject|iframe|embed|object|audio|video|handler|listener)\b/i, 'svg.active'],
  [/\son[a-z]+\s*=/i, 'svg.event'],
  [/j\s*a\s*v\s*a\s*s\s*c\s*r\s*i\s*p\s*t\s*:|vbscript\s*:|data\s*:/i, 'svg.scriptUrl'],
  // A quote may only be followed by '#': references must stay inside the document.
  [/(?:^|\s)(?:xlink:)?href\s*=\s*(?:["']\s*)?[^#"'\s]/i, 'svg.href'],
  [/url\(\s*(?:["']\s*)?[^#"'\s)]/i, 'svg.url'],
  // CSS escapes can disguise `url()` inside a style element or presentation attribute.
  [/\\/i, 'svg.url'],
  [/@import/i, 'svg.import'],
];

/** Null when the SVG is acceptable, else the reason of the refusal. */
export function checkSvg(text: string): MessageKey | null {
  const body = text.replace(/^﻿/, '');
  if (!/^\s*(<\?xml[^>]*\?>\s*)?(<!--[\s\S]*?-->\s*)*<svg[\s>]/i.test(body)) return 'svg.notSvg';
  for (const variant of [body, decodeEntities(body)]) {
    for (const [pattern, reason] of FORBIDDEN) if (pattern.test(variant)) return reason;
  }
  return null;
}

const WEIGHTS: [RegExp, number][] = [
  [/thin|hairline/, 100],
  [/extra-?light|ultra-?light/, 200],
  [/light/, 300],
  [/medium/, 500],
  [/semi-?bold|demi-?bold/, 600],
  [/extra-?bold|ultra-?bold/, 800],
  [/black|heavy/, 900],
  [/bold/, 700],
];

/**
 * Font description guessed from a file name (`Inter-SemiBoldItalic.woff2`, `lora-latin-wght-normal.woff2`),
 * corrected by the user in the media library if needed.
 */
export function guessFont(fileName: string) {
  const base = fileName.replace(/\.woff2$/i, '');
  const lower = base.toLowerCase();
  const variable = /wght|variable|\[/.test(lower);
  const weight = variable ? null : (WEIGHTS.find(([re]) => re.test(lower))?.[1] ?? 400);
  const family =
    base
      .split(/[-_[]/)[0]
      ?.replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/[^A-Za-z0-9 _-]/g, '')
      .trim()
      .slice(0, 60) || 'Police';
  return {
    family: family.charAt(0).toUpperCase() + family.slice(1),
    weight: weight === null ? { min: 100, max: 900 } : { min: weight, max: weight },
    style: /italic|oblique/.test(lower) ? ('italic' as const) : ('normal' as const),
  };
}

/** Display name from an uploaded file name: no control characters, bounded. */
export const cleanName = (name: string | null) =>
  (name ?? '')
    .replace(/[\p{Cc}\p{Cf}]/gu, '')
    .trim()
    .slice(0, 200);
