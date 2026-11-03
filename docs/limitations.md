# Known limitations — milestones 1 to 3

**Status on 11/02/2026.** Limitations accepted for the delivered milestones and the changes that followed; some are for future work.

## Changes from 10/31 to 11/02/2026

- Borders, shadows, gradients and background images (ADR-0017): one shadow and one background image per element, border on all four sides at once; background images published without optimization (warning above 500 KB); no token in shadow and gradient colors.
- Imported fonts (ADR-0018): WOFF2 only; catalog of 25 free fonts with a Latin character set; the license of a font imported by hand is for the user to check.
- List component: bullets or numbers, one level, rich-text items.
- Fine typography, sticky elements and line breaks (ADR-0019, 11/01/2026). Rich text (ADR-0020): paragraphs, color per passage (literal value, no token), rich headings, gradient text over the whole element; no size or background on part of a text, no subheading or list inside a text.
- Gallery (ADR-0021): masonry with CSS columns (visual order by column), tiles, enlarge on click; no category filters, progressive loading or automatic slideshow.
- Marquee and carousel (ADR-0022): marquee of texts or images in CSS (no speed change on hover, no scroll-linked motion); image-only carousel (no composed slide, pagination dots or fade).
- Custom CSS (ADR-0023): one stylesheet per project (64 KB) and 8 classes per element; no element-specific CSS, no @font-face, @import or external resource; the stylesheet does not apply to the thumbnails of the section library; editor with simple syntax highlighting (no completion or folding).

## Milestone 3 delivered

- AI assistant (ADR-0014): single-turn proposals, reviewed as a diff without a preview in the canvas; quality not evaluated with a real model; quota counters in memory, without accounts; no streaming; real providers tested against fake servers.
- Reusable components: parameters addressed by path (reordering a definition can move them), parameter list fixed at creation, update summarized without a detailed diff, saved sections specific to the project.
- Services: operation log limited to the session (neither persisted nor recording undos); global diff for site-level fields (tokens, menus…).
- Composition: handles and guides with the mouse only (the inspector fields cover the keyboard); no multiple selection or rotation handle.
- Animations: one set of hover/focus transitions per element (they now compose with transforms); the reduced motion simulated in the canvas does not cut CSS transitions; no curve editor or timeline.
- Site templates: name and description entered through `prompt`, without a thumbnail; shared between installations by copying files.

## Milestone 2 delivered

- Projects, pages, design tokens, menus, header/footer, site preview, media library and richer components, SEO, checks before export, complete export (404, sitemap, robots, redirects, static build) and archive available. Demonstration: `npm run demo:site`.
- Components: YouTube/Vimeo video only (no local file), 20 icons, no form; a closed accordion is edited through "Open" or the tree.
- Media library: no folders, file replacement or cleanup of orphans (fonts: see the changes of 10/31/2026). The bench no longer compares image pixels, optimized at build time (ADR-0010).
- Navigation: one submenu level, no closing with Escape; the collapsed menu opens in the flow. One header and one footer in the interface.
- Export: static build run within the request (network required, no progress); no ZIP; no contrast check in the Studio; sitemap and absolute URLs only when the site URL is set.
- Trash (`data/trash/`) never emptied by the Studio, no restore from the interface.
- Milestone 1 documents (`data/documents/`) are imported from the Projects screen; their media (`data/media/`) are not carried over.

## Editing

- **Rich text.** Bold, italic and link; links are entered through `prompt()`. The editor relies on `execCommand`, deprecated but universally supported. Lists go through the List component (one level, no sublist); no inline headings.
- **Drag and drop.** Elements cannot be grabbed directly in the canvas (use the tree or the library), and there is no auto-scroll during a drag.
- **Clipboard** internal to the Studio tab. No exchange with the system clipboard, no pasting between documents: a media file missing from the target document is refused.
- **Inline editing** in the canvas is missing: texts are edited in the inspector.
- **Design tokens** (ADR-0009): no shadow tokens or editable breakpoints; fonts imported in WOFF2 only (ADR-0018); font and weight of text styles adjustable at the base breakpoint only in the panel.
- **Breakpoints.** The model accepts any number of breakpoints, but the interface cannot create them yet: desktop, tablet and mobile come with the templates.

## Persistence and media

- **No authentication in the Studio.** Locally, the API goes through the Vite server on 127.0.0.1. Hosted (ADR-0015, `deploy/README.md`), the Studio runs in a container behind nginx, which provides HTTPS and the password: anyone logged in has full rights, without accounts or roles.
- **Media.** One folder per project (`data/projects/<id>/media/`). No cleanup of orphan files. Raster images optimized when the export is built (WebP, `srcset`), SVG and files copied as they are.
- **Image dimensions** measured by the browser; the server only checks their form.
- **Closing a tab.** No local draft: the protection is `beforeunload`.

## Languages (ADR-0024)

- **Interface, generated content and export translated.** The Studio, the components, the messages of the core and of the server go through the catalogs of `packages/core/src/i18n/locales/`; the interface opens in the browser's language when it has a catalog, else in English. The content the Studio writes into a site (default text of an element, sections, header and footer, new page, 404 page, accessible texts of the carousel, gallery and marquee) follows the site language (`settings.lang`), English when it has no catalog. The developer files of the export (README, `MEDIA.md`, `redirects/README.md`, comments) are in English.
- **Site templates**: Studio Orbe and Cabinet Valéor exist in French and English; **Atelier Nord** (an archive, not written in code) and the starter pages remain in French. Another language is added with a dictionary `templates/translations/<template>.<language>.json`.
- **Simulated assistant** (demonstrations and tests): it understands instructions in French and English, but its answers and the content it proposes remain in French.
- **Schema messages**: zod's own messages (types, lengths) stay in English whatever the language; only the messages written for the Studio are translated.
- **Changing the language** reloads the page; the choice is kept in the browser (`localStorage`), not on the server.
- **Right-to-left languages** are not supported.
- **History**: the milestone reports, studies and research (`docs/history/`) remain in French.
- **User guide** in French only (until ADR-0024, lot 6).

## Rendering and export

- **Fidelity** measured on **Chromium only**, on one machine, with system fonts. Firefox, WebKit and web fonts are not covered.
- **Exported components** as `.tsx` rendered by Astro at build time (ADR-0002); React is not shipped to the browser. A "100% `.astro`" export would need another strategy (S2).
- **Sending to the canvas.** The full document is sent on every change; there is no measurement on a large page (R9).
- **Isolation.** The canvas iframe uses `allow-same-origin` (Vite server constraint, R3): no security isolation from the shell.
- **Readability of the export.** The exported CSS classes derive from ids (`ns-<id>`), without semantic names.

## Accessibility

- **Automated check** with axe-core (WCAG 2.1 A/AA rules, serious violations) on the exported pages and on the editor. A human review is still needed (CS-12).
- **Editor.** Drag and drop has no direct keyboard equivalent: cut, select the target, then paste. Moves within the same parent go through Move up and Move down.
