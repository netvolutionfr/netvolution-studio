# Jalon 2 — Tranche 3 : design tokens

**Date :** 30/10/2026 · **Périmètre :** SB-05 (étude jalon 2 §4.3, §9), ADR-0009 · **Statut :** livré

## Livré

| Élément | Emplacement | Vérification |
|---|---|---|
| Champ optionnel `tokens` de la v2 : couleurs, tailles responsives (espacements, arrondis, largeurs maximales, tailles de police), piles de polices, styles de texte responsifs | `core/src/style/tokens.ts`, `document/schema.ts` | `tokens.test.ts` |
| Références `{ token }` sur les couleurs et les longueurs ; nouvelles propriétés `textStyle` et `fontFamily` ; `loadSite` refuse un token absent (`missing-token`) ou un breakpoint inconnu dans un token | `style/schema.ts`, `document/load.ts` | `tokens.test.ts` |
| CSS par variables : `:root` puis redéfinitions dans les media queries existantes ; un style de texte s'applique dans la règle du nœud, avant ses valeurs locales ; les styles `body` et `h1`…`h6` stylent aussi les éléments HTML | `style/css.ts` | `tokens.test.ts`, banc |
| Commandes `setToken` et `removeToken` (suppression refusée si le token est utilisé) | `editor/commands.ts` | `tokens.test.ts`, e2e |
| Panneau Design system (bouton de la barre d'outils, à la place de l'inspecteur, canvas visible) : ajout, renommage, valeurs par breakpoint, suppression | `shell/DesignSystem.tsx` | e2e |
| Inspecteur : style de texte, police, token dans la liste des unités pour les longueurs, token ou couleur personnalisée pour les couleurs | `shell/StyleFields.tsx` | e2e |
| Fixture de banc `tokens.json` (tokens responsifs sur 3 breakpoints), aussi proposée comme modèle de projet | `fixtures/tokens.json` | banc : 4 largeurs, aucun écart |
| README de l'export : tableau des variables de tokens | `export-astro/src/generate.ts` | `export.test.ts` |

## Choix faits pendant la tranche

- **Pas de classe de style de texte** : les vues et l'export ne changent pas (ADR-0009 §4).
- **Ids de tokens générés** (`couleur`, `espace-2`…) et figés ; l'utilisateur ne manipule que les libellés. Les styles de texte `body` et `h1`…`h6` se créent par des boutons dédiés.
- **Le panneau Design system remplace l'inspecteur** plutôt qu'une boîte de dialogue modale : l'effet d'une modification est visible immédiatement dans le canvas.
- **Une longueur à token** affiche la valeur de base du token, sans pouvoir la modifier ; choisir une unité revient à une valeur personnalisée.

## Vérifications

| Commande | Résultat |
|---|---|
| `npm run typecheck`, `npm run lint` | sans erreur |
| `npm test` | 91/91 |
| `npm run test:e2e` | 29/29, dont « une couleur modifiée se répercute sur 3 pages » et le refus de suppression d'un token utilisé |
| `npm run test:fidelity` | 24/24 identiques (6 fixtures × 4 largeurs), dont `tokens` |
| `npm run demo` | réussie |

## Limites

- **Ombres** : pas de propriété d'ombre dans le modèle, donc pas de token d'ombre.
- **Breakpoints** : non éditables (ceux des modèles).
- **Polices** : piles de polices installées ou système uniquement ; les fichiers de police (`@font-face`) arrivent avec la médiathèque (tranche 5).
- **Couleurs** : pas de transparence via le sélecteur natif (`#rrggbb`), bien que le modèle accepte `#rrggbbaa`.
- **Styles de texte** : la police et la graisse ne se règlent qu'en base dans le panneau ; le modèle accepte des variantes par breakpoint.
