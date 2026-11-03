# Tranche 3 — Inspecteur généré, nouveaux composants, bibliothèque et glisser-déposer

**Date :** 29/10/2026 · **Périmètre :** T12, T06 (bouton, séparateur, espaceur), T13

## Livré

| Élément | Emplacement | Vérification |
|---|---|---|
| Contrat `fields: PropField[]` (text, textarea, number, boolean, select, link, richText) | `packages/core/src/registry/registry.ts` | `components.test.ts` |
| `linkSchema` / `hrefSchema` partagés (http, https, mailto, tel, #ancre) | `packages/core/src/document/links.ts` | tests composants |
| Commande `insertTree` : modèle de sous-arbre (presets, futur collage, IA) ; `insertNode` y délègue | `packages/core/src/editor/commands.ts` | `drop.test.ts` |
| `computeDropTarget`, `isNoopMove`, `insertionPoint` (fonctions pures) | `packages/core/src/editor/drop.ts` | `drop.test.ts` |
| Composants `button` (3 variantes), `divider`, `spacer` | `packages/components/src/<type>/` | tests, banc |
| 4 compositions : Section, Rangée 2 colonnes, Rangée 3 colonnes, Hero | `packages/components/src/presets.ts` | `components.test.ts` |
| Inspecteur généré : contenus depuis `fields`, styles communs depuis `styleGroups` | `apps/studio/src/shell/{Inspector,PropFields,StyleFields}.tsx` | e2e |
| Texte enrichi limité (gras, italique, lien) | `apps/studio/src/shell/RichTextField.tsx` | e2e |
| Bibliothèque (clic ou glisser) et glisser-déposer depuis l'arborescence | `apps/studio/src/shell/{Library.tsx,drag.ts}` | e2e |
| Zoom d'ajustement du canvas | `apps/studio/src/shell/Canvas.tsx` | e2e |
| Fixture `elements.json` (boutons, séparateurs, espaceur, texte enrichi) | `fixtures/` | banc |

## Fonctionnement

### Inspecteur

- **Contenu.** Les contrôles proviennent des `fields` déclarés par chaque composant.
- **Styles.** Ils sont **mutualisés** : chaque propriété de la liste blanche a un contrôle unique (`STYLE_FIELDS`), affiché si le composant déclare le groupe correspondant. Les types de contrôle sont : longueur avec unité (avec slider pour les dimensions principales), sélection, nombre, booléen, couleur.
- **Sections.**
  - Content.
  - Layout : flex, grid, élément, dimensions.
  - Espacements : padding et marges, en grille 2 × 2.
  - Style : typographie, fond.
  - Advanced : visibilité, nom, classe CSS.
  - Pour un composant de contenu, Style passe avant Layout.
- **Breakpoint.** Chaque valeur s'édite au breakpoint actif. L'inspecteur indique « défini ↺ » (cliquer réinitialise) ou « hérité ».
- **Transactions.** Glissement de slider, saisie numérique ou texte, et sélection de couleur produisent chacun une seule étape d'annulation.

### Texte enrichi

- Un seul paragraphe, édité en `contentEditable` avec `execCommand`.
- Le DOM est relu par un analyseur à liste blanche : texte, `strong`/`b`, `em`/`i`, `a[href]`. Tout le reste est aplati en texte.
- Le collage se fait en texte brut, et Entrée est désactivée.
- Le DOM affiché est construit sans `innerHTML`.
- Les liens passent par `hrefSchema`, en saisie comme en validation du document.

### Insertion

- **Par clic :** dans la sélection si c'est un conteneur compatible, sinon après elle, sinon en fin de page.
- **Par glissement :**
  - La cible est le conteneur le plus profond sous le pointeur qui accepte le type.
  - L'index vient de l'enfant le plus proche, comparé horizontalement s'il a un frère à côté (rangées, lignes de grille), verticalement sinon.
  - Sous ou au-dessus du contenu, l'élément va en fin ou en début de page.
  - Un nœud ne peut jamais être déposé dans lui-même.
- **Retour visuel :** trait d'insertion (ou cadre du conteneur vide) dessiné par le shell, et vignette qui suit le pointeur, en rouge « dépôt impossible ici » si aucune destination n'est autorisée.
- **Annulation :** Échap annule le glissement.

### Zoom

Quand la largeur d'aperçu dépasse la zone disponible, le cadre est réduit par `transform: scale`. L'iframe garde sa largeur réelle, donc les media queries ne changent pas, et les coordonnées de glissement sont corrigées de l'échelle.

## Problèmes rencontrés et corrigés

1. **Capture du pointeur.** Les déplacements au-dessus de l'iframe n'atteignaient pas l'élément source, malgré `setPointerCapture`, sous Chromium. Une couche transparente plein écran est affichée pendant le glissement ; c'est l'option « couche de capture » de l'étude.
2. **État du glissement perdu.** Les gestionnaires étaient recréés à chaque rendu React, ce qui perdait l'état. La session est désormais conservée au niveau du module (un glissement à la fois). Avant correction, un dépôt apparent n'était en fait qu'un clic d'insertion ; le test de bout en bout exige maintenant le trait d'insertion.
3. **Axe de comparaison.** Le premier algorithme utilisait toujours l'axe horizontal quand le pointeur était sur un enfant, y compris dans une colonne. Le test unitaire l'a révélé ; l'axe est maintenant déduit de la disposition des frères.
4. **Défilement horizontal parasite.** Le focus de l'iframe trop large provoquait un défilement horizontal ; le zoom d'ajustement le supprime.

## Écarts et limites

- **Image** non livrée : un composant image référence un média par identifiant. Il est reporté à la tranche 4, avec la persistance et le stockage des médias (T15 et T16).
- **Liens du texte enrichi** saisis par `prompt()`, avec un message `alert()` en cas de refus : fonctionnel, mais rudimentaire.
- **`execCommand`** est déprécié mais universellement supporté (commentaire `ponytail`).
- **Glisser-déposer dans le canvas même** (prendre un élément dans l'aperçu) non pris en charge : on déplace depuis l'arborescence. Pas non plus de défilement automatique pendant le glissement.
- **Clavier.** Au clavier, les déplacements se font avec Monter et Descendre, au sein du même parent ; couper-coller vers un autre conteneur relève de T14.
- **Panneaux** toujours à largeur fixe, et toujours pas de navigation aux flèches dans l'arborescence (T11).
- **Document par défaut.** Le document ouvert au démarrage est le premier par ordre alphabétique, désormais `elements`.

## Vérifications

- `npm run check` : 59 tests unitaires, typecheck et lint au vert.
- `npm run test:e2e` : 15/15. Les 8 contrôles de la tranche 2 s'ajoutent à :
  - insertion par clic ;
  - glissement d'une composition en fin de page ;
  - déplacement depuis l'arborescence avec identifiants conservés ;
  - couleur de fond ;
  - masquage sur mobile seul ;
  - mise en gras ;
  - absence d'erreur console.
- `npm run test:fidelity` : **16/16** identiques (4 fixtures × 4 largeurs), 0 `<script>` exporté.

## Prochaine tranche proposée (tranche 4)

T15 persistance et T16 médias, puis le composant image :

- adaptateur de développement (middleware Vite, écriture atomique) ;
- import et export JSON ;
- échecs visibles ;
- upload d'images avec vérification de signature ;
- composant image avec `alt` obligatoire ;
- copie des médias à l'export.
