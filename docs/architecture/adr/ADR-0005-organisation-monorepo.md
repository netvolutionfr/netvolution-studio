# ADR-0005 — Organisation du monorepo

**Statut :** Accepté le 29/10/2026 · **Date :** 29/10/2026 · **Réf. :** 00 §3.2, CLAUDE §3–4 ; étude §2, §10

## Contexte

Monolithe modulaire, pas de multiplication prématurée des packages, frontières de responsabilité préservées, export compilable hors dépôt.

## Décision recommandée

```text
apps/studio/            Vite + React : shell, panneaux, canvas (2e entrée), dev-server/ (middlewares)
packages/core/          document, registry, style, commands, editor, protocol, persistence — sans React
packages/components/    définitions + vues React pures (copiées dans l'export)
packages/export-astro/  template/ (package.json + lockfile), générateur, CLI
fixtures/               documents de référence
tests/fidelity/         Playwright
docs/architecture/adr/
```

1. **npm workspaces** ; aucun orchestrateur (Turborepo, Nx).
2. Packages consommés **en sources TS** (`exports` → `src/index.ts`) ; pas de build intermédiaire.
3. `tsconfig.base.json` strict (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`) ; `typecheck` par workspace.
4. **Biome** pour lint et format, avec `noRestrictedImports` : `core` n'importe ni React ni le DOM ; `components` n'importe ni `apps/` ni l'éditeur ; vues sans `useState`, `useEffect`, `dangerouslySetInnerHTML`.
5. Scripts racine : `dev`, `check` (typecheck + lint + test + audit), `test:fidelity`, `export`.
6. Versions **exactes** (`save-exact=true` dans `.npmrc`), `engines.node` fixé, `.nvmrc`.
7. `resources/oshin` (référence Tatsu/Oshin) et `prototypes/` hors du code produit ; `resources/` ignoré par git.

## Alternatives

- **pnpm** : isolation stricte des dépendances, mais non fonctionnel sur le poste actuel et l'export utilise npm ; peut être adopté plus tard sans impact sur l'architecture.
- **Un seul package** : plus simple, mais la frontière « modèle sans React » ne serait plus vérifiée mécaniquement.
- **Découpage fin** (`document`, `registry`, `style`… en packages) : prématuré ; les sous-dossiers de `core` suffisent.
- **ESLint + Prettier** : plus de dépendances et de configuration pour un besoin couvert par Biome.

## Conséquences

- Ajout d'un package seulement sur séparation concrète (ex. futur `site-model` au jalon 2 si `core` devient trop large).
- Les fichiers d'index (liste du registre, middlewares, `package.json` racine) ont un propriétaire unique lors du travail parallèle.

## Points ouverts

- [H] Compatibilité de TypeScript 7.0 avec Vite 8, Vitest 5 et Biome ; repli sur la dernière 5.x ou 6.x.
- [O] CI (GitHub Actions ou autre) : à choisir avec l'hébergement du dépôt.
