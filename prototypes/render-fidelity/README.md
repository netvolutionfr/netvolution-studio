# Prototype — rendering fidelity, preview ↔ Astro export

> **Throwaway prototype.** It validates an assumption of ADR-0002; it is neither the final
> architecture, nor the document format, nor the future style engine.

## Assumption tested

**Pure** React components (no state, no effect), rendered:

- on the client by `react-dom` (stand-in for the canvas: `/preview/`, `client:only="react"`);
- on the server by Astro + `@astrojs/react` without a `client:` directive (stand-in for the export: `/`);

with the **same stylesheet** produced by a pure engine (`shared/css.ts`, desktop-first `max-width`
media queries), give identical DOM, computed styles, boxes and pixels, and the export contains no
JavaScript.

## Running

```sh
npm ci
npm run build      # astro build → dist/
npm run fidelity   # Playwright/Chromium: 1280, 1024, 768, 375 px
```

## Result (10/29/2026, Astro 7.4.4, React 19.3.1, headless Chromium, Playwright 1.64)

| Width | DOM (sorted attributes) | Computed styles + boxes | Pixels (full page) |
|---|---|---|---|
| 1280 | identical | 0/18 elements differ | identical |
| 1024 | identical | 0/18 | identical |
| 768 | identical | 0/18 | identical |
| 375 | identical | 0/18 | identical |

- `<script>` in `dist/index.html`: **0**.
- Copy outside the repository + `npm ci` + `astro build`: **succeeded**.

## Findings

1. Client React serializes `<img>` with `src` last: the attribute order differs, with no semantic
   effect. The comparison therefore normalizes attribute order.
2. `npm ci --omit=optional` **breaks** the build: rolldown's native binaries are optional
   dependencies. The lockfile does contain the Linux/Windows variants; the export README must
   document a plain `npm ci`.
3. The export's `node_modules` ≈ 166 MB (Astro + React at build time; nothing at runtime).

## Limits

- One browser (Chromium), one machine, system fonts: cross-OS comparison is not covered.
- The real canvas will be an iframe of the editor, not a `client:only` Astro page; only the
  rendering path (client react-dom + same CSS) is represented.
- The exported page renders JSON through `<Page doc>`; the recommended export generates explicit
  JSX (see ADR-0002), not tested here.
- `playwright` is among the prototype's dependencies; it would not belong in an export.
