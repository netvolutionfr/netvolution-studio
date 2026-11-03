# ADR-0010 — Media library, SVG and image optimization

**Status:** Accepted on 10/30/2026 (optimization choice approved by the user) · **Date:** 10/30/2026 · **Ref.:** SB-06, ADR-0002, ADR-0008; milestone 2 study §4.5

## Context

SB-06 asks for:
- importing images, safe SVGs and downloadable files;
- organization and search;
- metadata and alternative text;
- detection of missing resources;
- image optimization at export: suitable formats, dimensions, responsive variants, lazy loading, originals kept.

ADR-0002 requires the canvas and the export to share the same views, and the fidelity bench compares their DOM and their pixels. The study left the optimization tool open: `sharp` on import in the Studio, or `astro:assets` when the export is built.

## Decision

1. **Typed media**: `Asset` becomes a union of three types.
   - `image` (PNG, JPEG, WebP, AVIF) and `svg` carry their dimensions and a default alternative text.
   - `file` (PDF, ZIP, DOCX, XLSX, PPTX) carries its size.
   - The `name` and `tags` metadata are shared and optional, so existing sites stay valid without a migration.
   - Components reference a media file by id. An `asset` field declares the types it accepts (`accept`), and `loadSite` refuses a missing media file or one of a type not accepted.
   - A link can target a media file (`{ kind: 'asset', assetId }`), for instance a file to download.
2. **SVG: check by refusal, without rewriting.** An SVG is refused if it contains a DOCTYPE or an entity, an active element (`script`, `foreignObject`, `iframe`, `object`, `embed`…), an `on*` attribute, a `javascript:` or `data:` URL, an `href` or `url()` reference that does not point into the document (`#id`), or an `@import`. The check covers the raw text and its version with numeric entities decoded. The SVG is rendered **only through `<img>`**. The Studio serves it with `Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'` and `nosniff`.
3. **Files**: allowlist of types, signature checked (`%PDF-`, `PK\x03\x04`), served with `Content-Disposition: attachment`.
4. **Optimization at build time with `astro:assets` (the user's choice).**
   - Raster images placed by a component are exported to `src/media/`, and the original is kept.
   - The generated Astro page calls `getImage` (WebP variants of 480, 960 and 1600 px, capped at the original width, plus a `sizes`) and passes `src`, `srcSet` and `sizes` to the view, which adds them to `<img>`.
   - SVGs, files and linked media go as they are into `public/media/`.
   - An eagerly loaded image receives `fetchpriority="high"`; the others stay `loading="lazy"`.
5. **Fidelity.** The canvas shows the original, the export a variant.
   - The bench now compares the `src` of an image by media id and ignores `srcset` and `sizes`.
   - It masks the pixels of images in the screenshots, but still compares their boxes and computed styles: an image cannot shift the layout without being detected.

## Alternatives

- **`sharp` on import**: identical variants in the canvas and the export, so pixel fidelity is kept. In return, one more native dependency in the Studio.
- **No optimization**: no dependency, but SB-06 is only partly covered.

## Consequences

- No new dependency in the Studio. The export relies on Astro's default image service (sharp, already in its lockfile).
- Image pixels are no longer compared by the bench; an accepted loss of coverage.
- The export CLI reads the media from the `media/` folder next to the document.
