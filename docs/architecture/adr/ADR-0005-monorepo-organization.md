# ADR-0005 — Monorepo organization

**Status:** Accepted on 10/29/2026 · **Date:** 10/29/2026 · **Ref.:** 00 §3.2, CLAUDE §3–4; study §2, §10

## Context

Modular monolith, no premature multiplication of packages, responsibility boundaries preserved, export buildable outside the repository.

## Recommended decision

```text
apps/studio/            Vite + React: shell, panels, canvas (2nd entry), dev-server/ (middlewares)
packages/core/          document, registry, style, commands, editor, protocol, persistence — no React
packages/components/    definitions + pure React views (copied into the export)
packages/export-astro/  template/ (package.json + lockfile), generator, CLI
fixtures/               reference documents
tests/fidelity/         Playwright
docs/architecture/adr/
```

1. **npm workspaces**; no orchestrator (Turborepo, Nx).
2. Packages consumed **as TS sources** (`exports` → `src/index.ts`); no intermediate build.
3. Strict `tsconfig.base.json` (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`); `typecheck` per workspace.
4. **Biome** for lint and format, with `noRestrictedImports`: `core` imports neither React nor the DOM; `components` imports neither `apps/` nor the editor; views without `useState`, `useEffect`, `dangerouslySetInnerHTML`.
5. Root scripts: `dev`, `check` (typecheck + lint + test + audit), `test:fidelity`, `export`.
6. **Exact** versions (`save-exact=true` in `.npmrc`), pinned `engines.node`, `.nvmrc`.
7. `resources/oshin` (Tatsu/Oshine reference) and `prototypes/` outside the product code; `resources/` ignored by git.

## Alternatives

- **pnpm**: strict dependency isolation, but not working on the current machine and the export uses npm; can be adopted later with no impact on the architecture.
- **A single package**: simpler, but the "model without React" boundary would no longer be checked mechanically.
- **Fine split** (`document`, `registry`, `style`… as packages): premature; the subfolders of `core` are enough.
- **ESLint + Prettier**: more dependencies and configuration for a need covered by Biome.

## Consequences

- A package is added only for a concrete separation (e.g. a future `site-model` in milestone 2 if `core` becomes too large).
- The index files (registry list, middlewares, root `package.json`) have a single owner during parallel work.

## Open points

- [H] Compatibility of TypeScript 7.0 with Vite 8, Vitest 5 and Biome; fallback to the latest 5.x or 6.x.
- [O] CI (GitHub Actions or other): to choose with the repository hosting.
