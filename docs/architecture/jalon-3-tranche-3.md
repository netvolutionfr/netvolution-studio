# Jalon 3 — Tranche 3 : animations déclaratives

**Date :** 30/10/2026 · **Périmètre :** CS-05, CS-06, CS-07, CS-12 (lots CS-D, CS-E ; étude jalon 3 §4.4), ADR-0012 · **Statut :** livré

## Livré

| Élément | Emplacement | Vérification |
|---|---|---|
| Modèle `node.animations` (5 au plus) : déclencheurs chargement, apparition, survol, focus, clic ; effet opacité, décalage X/Y, échelle, rotation ; durée, délai, accélération (liste fermée ou `cubic-bezier` borné), répétitions (infinie au chargement seulement), sens, cascade des enfants ; commande `setAnimations` | `core/src/document/animations.ts`, `editor/commands.ts` | `animations.test.ts` |
| Survol et focus en **CSS pur** : transition et état visé (`:hover`, `:focus-visible`, `:focus-within`) dans la règle du nœud, neutralisés par `prefers-reduced-motion` | `style/css.ts` (`interactionCss`) | `animations.test.ts`, banc (survol) |
| **Îlot d'animation** (Web Animations API + IntersectionObserver, sans dépendance) : entrées au chargement, à l'apparition (préparée en pause, jouée à l'entrée dans le viewport) et au clic, cascade, `replay` pour le Studio ; rien n'est masqué par le CSS, rien ne s'anime en mouvement réduit | `components/src/animations/island.ts` | banc (contrôle dédié), `components.test.ts` (aucun import, aucune injection) |
| Export : données d'animation en JSON (`<` échappé) dans un `<script type="application/json">` hors du contenu, plus l'îlot `src/scripts/animate.ts`, uniquement sur les pages animées | `export-astro/src/generate.ts`, `write.ts` | `export.test.ts` |
| Canvas : animations **désactivées par défaut** (une modification ne les rejoue pas), activables, simulation du mouvement réduit, « Rejouer » d'un élément (message `replay`) ; l'éditeur lui-même n'est jamais animé ; aperçu du site animé comme le site publié | `canvas/main.tsx`, `shell/motion.ts`, `Canvas.tsx`, `preview/main.tsx` | e2e |
| Inspecteur : section « Animations » (ajouter, déclencheur, effet, paramètres, Rejouer, supprimer) ; un réglage au clavier = une annulation | `shell/AnimationFields.tsx` | e2e |
| Banc : comparaison de l'état final en mouvement réduit émulé ; fixture `animations.json` ; contrôle sur le site construit — carte masquée avant défilement puis révélée, survol effectif, aucun masquage ni animation en mouvement réduit et sans JavaScript | `tests/fidelity/run.ts`, `fixtures/animations.json` | banc 48/48 + contrôles conformes |

## Choix faits pendant la tranche

- **Données d'animation hors du DOM comparé.** Les animations ne relèvent d'aucun composant : leurs paramètres vont à l'îlot sous forme de données JSON. Côté export, elles sont dans un `<script type="application/json">` hors de `#ns-root` ; côté canvas, elles sont transmises directement. Les vues ne changent pas, et le DOM reste identique entre canvas et export.
- **Pas d'état initial masqué en CSS.** L'îlot prépare chaque animation, en pause pour l'apparition, et c'est ce qui applique l'état de départ. Sans JavaScript ou en mouvement réduit, le contenu reste visible.
- **Animations coupées par défaut dans le canvas** : y rejouer les animations à chaque frappe gênerait l'édition. On les active, ou on rejoue un élément, à la demande.

## Vérifications

| Commande | Résultat |
|---|---|
| `npm run typecheck`, `npm run lint` | sans erreur |
| `npm test` | 150/150 |
| `npm run test:e2e` | 36/36, dont « ajout depuis l'inspecteur, Rejouer, mouvement réduit simulé » |
| `npm run test:fidelity` | 48/48 identiques ; animations et interactions conformes |
| `npm run demo`, `npm run demo:site` | réussies |

## Limites

- **Survol et focus** : un seul jeu de transitions par élément (paramètres de la première animation). Ils entreront en conflit avec la future propriété `transform` de la tranche 4, à traiter alors.
- **Mouvement réduit simulé dans le canvas** : il coupe les animations de l'îlot, mais pas les transitions CSS de survol, qui suivent la préférence réelle du système.
- **Éditeur** : pas d'éditeur visuel de courbe d'accélération (`cubic-bezier` accepté par le modèle, absent de l'interface), pas de chronologie.
- **Dev** : une nouvelle fixture n'apparaît dans les modèles du serveur de développement qu'après son redémarrage.
