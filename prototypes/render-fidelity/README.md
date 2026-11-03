# Prototype — fidélité de rendu aperçu ↔ export Astro

> **Prototype jetable.** Il valide une hypothèse de l'ADR-0002 ; ce n'est ni l'architecture
> définitive, ni le format documentaire, ni le futur moteur de styles.

## Hypothèse testée

Des composants React **purs** (sans état ni effet), rendus :

- côté client par `react-dom` (substitut du canvas : `/preview/`, `client:only="react"`) ;
- côté serveur par Astro + `@astrojs/react` sans directive `client:` (substitut de l'export : `/`) ;

avec la **même feuille CSS** produite par un moteur pur (`shared/css.ts`, media queries
`max-width` desktop-first), donnent un DOM, des styles calculés, des boîtes et des pixels
identiques, et l'export ne contient aucun JavaScript.

## Exécution

```sh
npm ci
npm run build      # astro build → dist/
npm run fidelity   # Playwright/Chromium : 1280, 1024, 768, 375 px
```

## Résultat (29/10/2026, Astro 7.4.4, React 19.3.1, Chromium headless Playwright 1.64)

| Largeur | DOM (attributs triés) | Styles calculés + boîtes | Pixels (page entière) |
|---|---|---|---|
| 1280 | identique | 0/18 éléments différents | identiques |
| 1024 | identique | 0/18 | identiques |
| 768 | identique | 0/18 | identiques |
| 375 | identique | 0/18 | identiques |

- `<script>` dans `dist/index.html` : **0**.
- Copie hors dépôt + `npm ci` + `astro build` : **réussi**.

## Constats

1. React client sérialise `<img>` avec `src` en dernier : l'ordre des attributs diffère, sans
   effet sémantique. La comparaison normalise donc l'ordre des attributs.
2. `npm ci --omit=optional` **casse** le build : les binaires natifs de rolldown sont des
   dépendances optionnelles. Le lockfile contient bien les variantes Linux/Windows ; il faut
   documenter `npm ci` simple dans le README des exports.
3. `node_modules` de l'export ≈ 166 Mo (Astro + React au build ; rien au runtime).

## Limites

- Un seul navigateur (Chromium), une seule machine, polices système : la comparaison
  inter-OS n'est pas couverte.
- Le canvas réel sera une iframe de l'éditeur, pas une page Astro `client:only` ; seul le
  chemin de rendu (react-dom client + même CSS) est représenté.
- La page exportée rend un JSON via `<Page doc>` ; l'export recommandé génère du JSX
  explicite (voir ADR-0002), non testé ici.
- `playwright` figure dans les dépendances du prototype ; il n'appartiendrait pas à un export.
