# Tranche 2 — Commandes, historique et shell de l'éditeur

**Date :** 29/10/2026 · **Périmètre :** T05, T10 minimal, extrait de T12 (inspecteur réduit)

## Livré

| Élément | Emplacement | Vérification |
|---|---|---|
| 7 commandes : `insertNode`, `moveNode`, `removeNode`, `duplicateNode`, `updateNodeProps`, `updateNodeStyle`, `renameNode` | `packages/core/src/editor/commands.ts` | `store.test.ts` |
| `EditorStore` : historique par instantanés, transactions, sélection, `dirty`, journal des commandes | `packages/core/src/editor/store.ts` | `store.test.ts` |
| `activeBreakpoint(doc, width)` : breakpoint édité à une largeur d'aperçu | `packages/core/src/style/css.ts` | `css.test.ts` |
| Protocole étendu : `layout`, `pointer`, `key` (canvas → shell), validé par Zod | `packages/core/src/protocol/messages.ts` | e2e |
| Shell : barre d'outils, arborescence, canvas en iframe, overlays, inspecteur réduit | `apps/studio/src/shell/` | e2e |
| Test de bout en bout du shell (8 contrôles) | `tests/e2e/shell.ts` | `npm run test:e2e` |

## Fonctionnement

- **Écriture du document.** Toute modification passe par `store.dispatch(nom, params)`.
  - Les paramètres sont validés par Zod.
  - La commande est appliquée sans mutation.
  - Le document résultant est **revalidé entièrement** (`loadDocument`). Un résultat invalide est refusé, le document reste inchangé et l'erreur s'affiche dans la barre d'outils.
- **Historique.**
  - Chaque entrée conserve `before`/`after` et le journal des commandes (nom + paramètres).
  - `dirty` compare le document courant au dernier enregistré par référence : annuler jusqu'à l'état enregistré rend `dirty` faux.
- **Transactions.**
  - Le slider ouvre une transaction au `pointerdown` et la valide au `pointerup` ou au `blur`.
  - Un champ texte l'ouvre à la première frappe et la valide au `blur` ou sur Entrée.
  - Au clavier, chaque cran du slider est une entrée.
- **Canvas.**
  - iframe `canvas.html` dont la largeur est celle de l'aperçu, donc les vraies media queries s'appliquent.
  - Le canvas renvoie les rectangles des nœuds (après rendu, défilement et redimensionnement), les clics et survols résolus via la classe `ns-<id>`, et les raccourcis pressés quand le focus est dans l'iframe.
  - Les clics n'y déclenchent aucune action par défaut, liens compris.
- **Overlays.** Survol et sélection sont dessinés par le shell au-dessus de l'iframe : le DOM du canvas reste celui de l'export (banc de fidélité toujours 12/12).
- **Breakpoint édité.** C'est celui qui s'applique à la largeur d'aperçu (Desktop 1280, Tablette 820, Mobile 390, ou largeur libre). L'inspecteur indique si la valeur est définie sur ce breakpoint ou héritée, et permet de la réinitialiser.
- **Raccourcis.**
  - ⌘/Ctrl+Z annule ; ⇧⌘Z et Ctrl+Y rétablissent.
  - Suppr ou Retour arrière supprime l'élément sélectionné.
  - Échap désélectionne.
  - Ils sont inactifs dans les champs de saisie.

## Risque R3 — résolu par le repli prévu

**[F]** Avec `sandbox="allow-scripts"` seul, l'iframe a une origine opaque (`null`). Le serveur de dev Vite refuse alors de lui servir les modules (CORS : `Access-Control-Allow-Origin` limité à l'origine du serveur), et le canvas ne démarre pas.

**Option rejetée :** autoriser l'origine `null` dans la configuration CORS de Vite. N'importe quelle iframe sandbox d'un site tiers pourrait alors lire les sources servies par le serveur de dev.

**Décision :** `sandbox="allow-scripts allow-same-origin"`.

- Cette combinaison **n'isole pas** le canvas du shell : un script même origine peut retirer la sandbox.
- Elle bloque encore la navigation de la page parente, les popups et les formulaires.
- La sécurité repose sur l'invariant documentaire : aucun HTML ni script dans les documents, et un canvas qui n'exécute que le code du Studio.

À réexaminer si un jour le canvas doit afficher du contenu non maîtrisé, par exemple des embeds tiers : servir alors le canvas depuis une origine distincte.

## Écarts et choix provisoires

1. **Arborescence.** Listes imbriquées de boutons avec `aria-current`. Le motif ARIA `tree` (flèches, tabindex itinérant) est laissé à T11, car Biome signale à juste titre un rôle `tree` sans navigation au clavier.
2. **Inspecteur réduit.**
   - Champs disponibles : nom, texte et niveau du titre, texte simple, taille de police ou gap.
   - Actions : monter, descendre, dupliquer, supprimer.
   - L'inspecteur généré depuis les schémas reste T12.
   - Les textes enrichis (marques, liens) ne sont pas éditables.
3. **Documents.**
   - Les fixtures sont embarquées via `import.meta.glob` et sélectionnables dans la barre d'outils.
   - Pas encore de sauvegarde : un changement de document demande confirmation s'il y a des modifications, et la fermeture de l'onglet est protégée par `beforeunload`.
4. **Envoi du document.** Le document complet est envoyé au canvas à chaque modification, soit 40 messages environ pour un glissement de slider. Aucun ralentissement n'a été observé sur les fixtures ; R9 n'est pas mesuré sur une grande page.
5. **Validation.** Validation complète après chaque commande (commentaire `ponytail`), à rendre incrémentale si un profilage le justifie.
6. **Panneaux.** Largeurs fixes (260 et 300 px). Le redimensionnement des panneaux (VE-01) reste à faire.
7. **Aperçu.** À 1280 px, l'aperçu dépasse la zone disponible et défile horizontalement ; un zoom d'ajustement viendra plus tard.

## Vérifications

- `npm run check` : 43 tests unitaires, typecheck et lint au vert.
- `npm run test:e2e` : 8/8 sur le build de production.
  - R3 : canvas chargé dans une iframe sandbox.
  - Sélection canvas → arborescence et inspecteur, overlay aligné à moins de 1 px.
  - Sélection depuis l'arborescence.
  - Glissement du slider = une seule annulation.
  - Édition sur le breakpoint mobile sans effet sur le desktop.
  - Saisie vide refusée sans corrompre le document.
  - Suppr et ⌘Z relayés depuis le canvas.
  - Aucune erreur dans la console.
- `npm run test:fidelity` : 12/12 identiques.

## Prochaine tranche proposée (tranche 3)

1. T12 : inspecteur généré depuis les schémas (configuration `inspector` dans le registre, contrôles typés, groupes Content, Layout, Style, Advanced).
2. Composants `image`, `button` et `spacer`.
3. T13 : insertion depuis une bibliothèque, avec glisser-déposer calculé par `computeDropTarget`.
