# ADR-0021 — Gallery component: masonry, tiles, enlarge on click

**Status:** Accepted on 11/01/2026 · **Date:** 11/01/2026 · **Ref.:** CLAUDE §6, §8 and §9, ADR-0002 (islands), ADR-0010, `docs/history/research/essai-import-tatsu.md`

## Context

Portfolios rely on masonry galleries, with enlarge on click. The trial site has 11 of them; Oshine builds them with Isotope and PhotoSwipe. The Studio only had a grid of equal columns made of separate Image components, without enlarging.

## Decision

1. **A Gallery component** (`gallery`), whose props are:
   - `images`: up to 200 items `{ assetId, alt, caption? }`;
   - `layout`: `masonry` (natural heights) or `tiles` (images cropped to one `ratio`);
   - `lightbox`: enlarge on click.
2. **Masonry uses CSS multi-column**, without JavaScript or position computing.
   - The "Columns" and "Spacing" settings (`grid` group, responsive) adapt to the component type: for a component in `display: block`, `columns` is emitted as `column-count` and `gap` as `column-gap`; vertical spacing is exposed to the items through `--ns-gap`. Grid and stack do not change.
   - Accepted trade-off: the visual order follows the columns, top to bottom. The HTML order, followed by the keyboard and screen readers, stays that of the list.
3. **Enlarging** goes through an island (`gallery/island.ts`), loaded only by the pages that have a gallery.
   - Each image is a link to its large version; the island opens it in a native modal `<dialog>`, with previous and next, arrow keys, Escape and a click outside the image to close. Focus returns to the link.
   - Texts go only through `textContent`: nothing is injected as HTML.
   - Without JavaScript, the link opens the image itself.
   - The canvas does not load the island (a click selects there); the site preview does.
4. **A new field type, `assets` (media list)**, with a shared `fieldAssets()` function. It serves validation (existing media of an accepted type), usage counting (removal refused while an image is used) and copying at export.
5. **The export optimizes each raster image of the list like the Image component** (ADR-0010): WebP variants and `srcset`, merged image by image. Enlarging points to the largest variant.
6. **The "Gallery" composition** of the library becomes "Image grid", to avoid confusion.

## Rejected alternatives

- **A JavaScript masonry** (position computing, reading order in rows): JavaScript and a risk of layout shift on load, for a gain in visual order only.
- **`grid-template-rows: masonry`**: not yet supported by browsers.
- **A lightbox library** (PhotoSwipe, GLightbox): one more dependency, while `<dialog>` covers the essentials in a few dozen lines.

## Consequences

- Fidelity bench: the `composition` fixture contains a masonry gallery. The bench also checks enlarging on the export: opening, image loaded, arrows, caption, Escape, focus returned, fallback link without JavaScript.
- The Tatsu converter produced masonry galleries from Oshine's galleries.
- The guide documents the Gallery (chapters 3 and 7, appendix A).
