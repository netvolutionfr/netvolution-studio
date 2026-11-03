# ADR-0002 — Faithful rendering strategy, preview ↔ Astro

**Status:** Accepted on 10/29/2026 — confirmed by the fidelity bench of slice 1 (`docs/history/reports/tranche-1.md`) · **Date:** 10/29/2026 · **Ref.:** 00 §4, VE-07, VE-11, VE-12; study §5; `prototypes/render-fidelity/`

## Context

Preview/export fidelity is the main risk (CLAUDE §6). A component must not have two business implementations; the export must be understandable, standalone, without an NS runtime.

## Recommended decision — S1 "shared React views"

1. Each component has **one pure React view** (props → JSX; no state, effect, browser API or `dangerouslySetInnerHTML`), enforced by lint.
2. **Canvas**: an iframe rendering these views with `react-dom/client`, plus the stylesheet produced by `toCss(doc)`. Iframe width = preview width ⇒ the real media queries apply.
3. **Export**: an Astro project using `@astrojs/react` **without a `client:` directive**; the `.tsx` views are copied verbatim; `page.css` comes from the same `toCss`. Zero JS shipped.
4. **Exported page as explicit JSX** (props serialized with `JSON.stringify` inside expressions) for readability; fallback `<Page doc={json} />`.
5. **Fidelity bench** mandatory in CI: built export vs canvas, same browser/viewport/fonts/data; normalized DOM (attribute order), computed styles, boxes, pixels.

## Evidence

Prototype (Astro 7.4.4, React 19.3.1, Chromium) at 1280/1024/768/375 px: identical normalized DOM, 0/18 elements with a different style or box, pixel-identical screenshots, 0 `<script>`, build from the lockfile outside the repository succeeded. Difference observed: attribute order of `<img>` (no effect).

## Alternatives

| | Why not chosen for milestone 1 |
|---|---|
| S2 Neutral HTML IR + React/Astro serializers | Export without React, but a home-made DSL and two serializers to maintain; remains the option if a "100% .astro" export is required |
| S3 `.astro` components rendered on the server for the preview (Container API) | A rendering service, a round trip per keystroke, DOM synchronization; status of the API to check |
| S4 Canvas = `astro dev` of the export | Latency and coupling to the file system; only useful as a check |

## Consequences

- The export depends on `react`, `react-dom`, `@astrojs/react` **at build time** (not at runtime).
- Future interactivity (milestone 2: accordion, tabs) will have to favor native HTML (`<details>`) or targeted islands; later decision.
- Views are a public contract of the export: their readability matters.

## Addendum (slice 2, 10/29/2026)

Iframe `sandbox="allow-scripts allow-same-origin"`: without `allow-same-origin`, the Vite dev server refuses the modules at the `null` origin (R3, `docs/history/reports/tranche-2.md`). The canvas is therefore not isolated from the shell; protection relies on documents containing no HTML/JS.

## Open points

- [O] Acceptability of `.tsx` in an "Astro" export (else S2).
- [O] Explicit JSX page vs JSON, to validate in slice 1.
- [H] Stability of fidelity with local web fonts and other browsers (Firefox, WebKit).

## Addendum — JavaScript islands (milestone 2, slice 6, 10/30/2026)

Interactive components (tabs, video) keep a pure React view, rendered to static HTML at build time. Their
behavior comes from an **island**: a dependency-free `island.ts` module, next to the view.

- **Interface**: the island exports an idempotent `init(root)` function that enriches the existing markup. It
  never injects HTML built from data, and the tests forbid `innerHTML`, `eval` and imports.
- **Declaration**: the component definition carries `island: true`.
- **Export**: the module is copied into `src/scripts/` and loaded by an Astro `<script>`, only in the pages
  that use the component. The other pages stay without JavaScript, and the bench checks it.
- **Without JavaScript**: the server markup must stay usable. Tabs show as successive panels with their title,
  and the video as a link to the provider's page.
- **Fidelity**: after each rendering, the canvas runs the islands that shape the initial state (`canvasIslands`:
  the tabs), to keep a DOM identical to the export. An island that only acts on interaction (the video) does not
  touch the DOM before it. The canvas does not run it, which avoids loading a third-party player in the editor.
- **Site preview**: it runs every island.
- **Bench**: it compares the enriched initial state (DOM, styles, pixels). On the built site, it also checks
  keyboard operation with JavaScript and reading without JavaScript.
