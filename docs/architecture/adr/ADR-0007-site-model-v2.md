# ADR-0007 — Site model v2

**Status:** Accepted on 10/30/2026 · **Date:** 10/30/2026 · **Ref.:** SB-01 to SB-05, SB-12, ADR-0001; milestone 2 study §4.1–4.2

## Context

Milestone 1 handles a standalone `ns.page` v1 document. Milestone 2 requires a multi-page site: pages and slugs, shared layouts (header, footer), menus, tokens, shared media, redirects. ADR-0001 planned the move `ns.page` → `ns.site` through a migration.

## Recommended decision

1. **One `ns.site` document (schemaVersion 2) per project**, serialized into a single file.
2. **Global node table** `nodes: Record<NodeId, Node>` shared by pages and layouts; each page and each layout points to its root (`rootId`). Each node is reached exactly once from a root.
3. `breakpoints`, `assets` and `tokens` at the site level.
4. `pages: Page[]` (Studio order), `Page = { id, title, slug, rootId, publish, layouts?, seo }`; empty slug = the home page, designated by `settings.homePageId`. Unique slugs, reserved segments refused.
5. `layouts: Layout[]` (`role: 'header' | 'footer'`), defaults in `settings.defaultLayouts`, override or `null` per page.
6. `menus: Menu[]` separate from the pages, depth ≤ 2; items with a `Link`.
7. `Link = { kind: 'url', href } | { kind: 'page', pageId, anchor? }`; semantic validation: existing `pageId`.
8. `redirects: { from, to: Link, status: 301 | 302 }[]`.
9. Pure, tested **v1 → v2 migration**: the page becomes the home page of a one-page site; breakpoints and assets moved up; no layout or menu.
10. `loadSite(input, registry)` replaces `loadDocument`: version (future → refused) → sequential migrations → Zod schema → semantics.
11. `ComponentDefinition.resolve(props, ctx)` receives `ctx = { site, pageId }`.

## Alternatives

- **One file per page + `site.json`**: smaller saves and concurrent editing per page possible, but several ETags, cross-file validation, a history that must coordinate several documents and a non-atomic save. Premature for a single-user showcase site. Remains possible behind the persistence port (ADR-0008).
- **One node table per page**: stronger isolation, but commands and the clipboard must know the page, and `ns-<id>` classes can collide in a shared stylesheet.
- **Nested tree** (illustration in 00 §5): already rejected by ADR-0001.

## Consequences

- The node commands of milestone 1 stay unchanged; only their document type and `toCss` (explicit roots) evolve.
- The canvas receives the site and the current page, and renders `header + page + footer`.
- Known ceiling: a `site.json` of several MB slows saving and validation. It will then have to be split per page.
- The v1 fixtures stay valid through the migration; the fidelity bench therefore exercises it on every run.

## Addendum (milestone 2, slice 1, 10/30/2026)

- The delivered v2 contains `settings` (`lang`, `homePageId`) and `pages`. Layouts, menus, tokens, SEO and redirects will be added as **optional** fields of v2 in their slices. An older v2 file will therefore stay valid without a migration.
- Reserved slugs: first segment `404` or `media`, and any `index` segment (collision with `src/pages/<slug>/index.astro`).
- Details: `docs/history/reports/jalon-2-tranche-1.md`.

## Open points

- [O] Layout variants in the interface (the model accepts them, the milestone's UI is limited to one main header and footer).
- [O] Page anchors (`anchor`): node id or a typed HTML id.

## Addendum — slice 4 (10/30/2026)

Optional fields added to v2, without a migration: `layouts` (`{ id, name, role, rootId }`), `settings.defaultLayouts`,
`page.layouts` (`header` / `footer`: absent = site default, `null` = none) and `menus` (items `{ id, label, link }`,
one level of `children`). Layout ids share the page id space, as the editor opens either.
