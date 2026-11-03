# Tranche 1 — JSON → canvas et export, fidélité mesurée

**Date :** 29/10/2026 · **Périmètre :** étude §14 (T01, T02, T03, T04, T06 partiel, T07, T08, T09 minimal)

## Livré

| Élément | Emplacement | Vérification |
|---|---|---|
| Monorepo npm workspaces, TS strict, Biome, Vitest | racine | `npm run check` |
| Schéma document v1, `loadDocument`, 15 codes de diagnostic | `packages/core/src/document/` | `load.test.ts` |
| Styles typés (28 propriétés, 8 groupes), héritage desktop-first, `toCss`, `resolveStyle` | `packages/core/src/style/` | `css.test.ts` |
| Contrat du registre, `createRegistry`, `canContain` | `packages/core/src/registry/` | `registry.test.ts` |
| Protocole canvas (schéma des messages) | `packages/core/src/protocol/` | utilisé par le canvas et le banc |
| Composants `container`, `stack`, `grid`, `heading`, `text` (texte riche limité) | `packages/components/src/<type>/` | `components.test.ts` |
| Canvas minimal (2e entrée Vite) | `apps/studio/canvas.html`, `src/canvas/main.tsx` | banc de fidélité |
| Générateur Astro + gabarit + lockfile + CLI | `packages/export-astro/` | `export.test.ts`, banc |
| 3 fixtures de référence (typographie, flex, grille avec breakpoint ajouté) | `fixtures/` | validées par les tests |
| Banc de fidélité | `tests/fidelity/run.ts` | `npm run test:fidelity` |

## Résultats

- `npm run check` : typecheck, lint et **28 tests** au vert.
- `npm run test:fidelity` : **12/12 comparaisons identiques**.
  - Périmètre : 3 fixtures × 1280, 1023, 767 et 420 px.
  - Critères : DOM normalisé, styles calculés et boîtes de tous les éléments, pixels pleine page, 0 `<script>` exporté.
  - Conditions : export installé par `npm ci` depuis le lockfile dans un répertoire temporaire hors dépôt ; environ 6 s.
- **Sensibilité du banc vérifiée.** Une règle `letter-spacing: 0.5px` ajoutée au seul canvas, sur un titre, est détectée à toutes les largeurs (style calculé et pixels).
- **ADR-0002 confirmé** pour ce périmètre.

## Écarts par rapport à l'étude et aux ADR

1. **La vue n'est pas dans `ComponentDefinition`.**
   - Le contrat porte `viewName`, et la vue réside par convention dans `components/src/<type>/view.tsx`.
   - Raison 1 : le CLI et le banc tournent sous Node, qui n'importe pas le TSX ; les définitions restent du TS pur.
   - Raison 2 : `core` reste sans React.
   - La correspondance type → vue est vérifiée à la compilation (`components/src/views.ts`).
2. **Frontières vérifiées par tests plutôt que par la règle Biome `noRestrictedImports`.**
   - Les vues n'importent que `react`, sans hook, sans `dangerouslySetInnerHTML` ni API navigateur.
   - `core` n'importe pas React.
   - Le test est portable et plus précis.
3. **Page exportée.** La composition en JSX explicite est dans `src/page/Page.tsx`, rendue par `src/pages/index.astro`. On évite ainsi d'imbriquer des composants React via des slots Astro, qui risquent d'insérer des éléments d'enrobage. **[H]** Ce risque n'a pas été testé : il a été évité par conception.
4. **TypeScript exécuté nativement par Node 24** (CLI, banc).
   - Contraintes : extensions `.ts` dans les imports et `erasableSyntaxOnly`.
   - Aucun `tsx` ou `ts-node` n'est nécessaire.
5. **Pas encore dans le contrat du registre** : `inspector` et `presets`. Ils arrivent avec l'inspecteur (T12) et la bibliothèque (T13).
6. `npm install-scripts deny fsevents` a ajouté `allowScripts.fsevents: false` au `package.json` racine. fsevents est une dépendance optionnelle macOS de surveillance de fichiers, sans effet sur les builds.

## Limites connues

- Fidélité mesurée sur **Chromium seul**, sur cette machine, avec polices système. Firefox, WebKit, polices web locales et autres OS ne sont pas couverts.
- Le canvas est testé en page de premier niveau, pas encore dans une iframe `sandbox`. R3, la compatibilité CORS avec l'origine `null`, reste à vérifier en tranche 2.
- `postMessage(..., '*')` dans le canvas, à restreindre avec le shell.
- Composants manquants pour le jalon 1 : `image`, `button`, `spacer`/`divider`. Les médias ne sont pas encore gérés.
- Pas de shell, de sélection, de commandes, d'historique ni de persistance : c'est la tranche 2 et suivantes.
- Le banc exige un Chromium Playwright installé (`npx playwright install chromium-headless-shell`).
- La mise à jour du lockfile du gabarit est manuelle : `npm install --package-lock-only` dans `packages/export-astro/template/`, puis `npm run test:fidelity`.

## Prochaine tranche proposée (tranche 2)

T05 (commandes, `EditorStore`, transactions, undo/redo), puis T10 minimal :

- shell à trois panneaux ;
- canvas en iframe avec vérification de R3 ;
- sélection synchronisée canvas ↔ arborescence via le protocole ;
- overlays dessinés dans le shell ;
- inspecteur réduit à une propriété de contenu et une propriété de style, pour valider la transaction d'un slider.
