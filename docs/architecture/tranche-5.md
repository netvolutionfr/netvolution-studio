# Tranche 5 — Finalisation et bilan du jalon 1

**Date :** 29/10/2026 · **Périmètre :** T14, T11, VE-01 (panneaux, aperçu), contrôles d'accessibilité, T18 · **Statut :** jalon 1 livré, validé le 30/10/2026

## Livré

| Élément | Emplacement | Vérification |
|---|---|---|
| `toTemplate` : sous-arbre → modèle ; copier / couper / coller / dupliquer (⌘C, ⌘X, ⌘V, ⌘D, boutons de l'inspecteur) | `core/editor/commands.ts`, `studio/src/shell/clipboard.ts` | `drop.test.ts`, e2e |
| Arborescence ARIA `tree` : ↑ ↓ ← → Début Fin, déplier / replier, sélection qui suit le focus | `studio/src/shell/Tree.tsx` | e2e |
| Panneaux redimensionnables (souris et clavier), largeurs mémorisées | `studio/src/shell/Splitter.tsx` | e2e |
| Mode Aperçu sans les contrôles de l'éditeur | `App.tsx`, `Toolbar.tsx`, `Canvas.tsx` | e2e |
| Audit axe-core (WCAG 2.1 A/AA, violations graves) des pages exportées et de l'éditeur | `tests/fidelity/compare.ts` | banc, e2e |
| Modèle « Page vide » ; interlignes des titres et espacement des rangées par défaut | `fixtures/blank.json`, `core/style/css.ts`, `components/src/presets.ts` | banc |
| **Démonstration reproductible du jalon** | `tests/e2e/demo.ts` (`npm run demo`) | rapport `test-results/demo-report.md` |

## Démonstration (`npm run demo`)

Le script exécute, dans l'interface réelle (build de production et API de développement sur un dossier temporaire), le scénario de `01-visual-editor.md` §6 :

1. Nouveau document depuis « Page vide ».
2. **Section hero.** Composition Hero, visuel remplacé par une image (envoi, texte alternatif), titre et paragraphe modifiés, bouton avec libellé et lien.
3. **Design.** Fond, marges internes et arrondi du hero ; taille du titre.
4. **Grille de trois cartes.** Composition Rangée 3 colonnes, première carte composée et stylée, duplication (⌘D), titres modifiés.
5. **Mobile.** Taille du titre réduite sur mobile. La grille passe à une colonne et le hero s'empile ; le desktop est vérifié inchangé.
6. **Enregistrer, recharger.** Enregistrement (⌘S), rechargement de la page, réouverture : canvas identique à l'état enregistré.
7. **Export Astro depuis le Studio**, puis `npm ci` et `npm run build` dans le dossier exporté, **hors du dépôt**.
8. **Mesures** à 1280, 1023, 767 et 420 px, canvas contre site construit : DOM, styles calculés, boîtes, pixels et audit axe.

Résultat au 29/10/2026 :

- DOM identique, 0 élément sur 18 en écart de style ou de boîte, pixels identiques, aucune violation grave, et ce aux quatre largeurs.
- 0 `<script>` dans le site.
- Média copié.
- Aucune erreur JavaScript.

## Problèmes trouvés et corrigés

- **Contraste insuffisant dans l'éditeur** (axe) : le type affiché dans l'arborescence avait une opacité de 0,6.
- **Nom accessible sans le libellé visible** (WCAG 2.5.3) : boutons « G » et « I » du texte enrichi, et boutons de réinitialisation « défini ↺ ».
- **Rendu par défaut perfectible**, repéré sur les captures de la démonstration : interligne des titres hérité du texte (1,5), grille collée au hero.
- **Contrôle « Fin » de l'arborescence** : l'attente du test était fausse (niveau 4 et non 3).

## Bilan du jalon 1 — Definition of Done (`01-visual-editor.md` §7)

| Critère | État | Preuve |
|---|---|---|
| Scénario démontrable de bout en bout | ✅ | `npm run demo` |
| Export Astro autonome | ✅ | Lockfile figé, build hors dépôt (démo, banc), 0 JS livré |
| Composants fondamentaux opérationnels | ✅ | container, stack, grid, heading, text, image, button, spacer, divider ; presets Section, Rangées, Hero |
| Sélection et manipulation visuelles | ✅ | Canvas ↔ arborescence, overlays, glisser-déposer, inspecteur généré |
| Historique fiable | ✅ | Instantanés, transactions (slider, saisie, couleur, image) ; tests unitaires et e2e |
| Sauvegarde / chargement | ✅ | API ETag, échecs visibles, conflits, import et export JSON validés |
| Tests du modèle documentaire | ✅ | 68 tests unitaires (validation, sérialisation, commandes, styles, glisser-déposer, API) |
| Tests de rendu et d'export | ✅ | Banc 20/20 (5 fixtures × 4 largeurs), démo 4/4 |
| Contrôles d'accessibilité de base | ✅ | axe-core sur les exports et l'éditeur, 0 violation grave ; navigation clavier |
| Documentation des limites | ✅ | `docs/limitations.md` |
| Aucun blocage empêchant le jalon 2 | ✅ (voir ci-dessous) | Contrats ouverts |

**Points d'attention pour le jalon 2** (contrats prévus, rien d'implémenté) :

- `ns.page` v1 → `ns.site` v2 : première migration documentaire.
- `Link` : ajout de `{ kind: 'page', pageId }`, rétrocompatible.
- Tokens : valeur `{ token }` dans l'union des styles, rétrocompatible.
- Médias à isoler par projet.
- L'adaptateur de persistance doit gérer des projets plutôt que des documents isolés.

## Vérifications finales

| Commande | Résultat |
|---|---|
| `npm run check` | typecheck, lint, 68 tests unitaires ✅ |
| `npm run test:e2e` | 24/24 ✅ |
| `npm run test:fidelity` | 20/20 identiques, 0 `<script>`, 0 violation a11y grave ✅ |
| `npm run demo` | démonstration réussie, 4/4 largeurs identiques ✅ |
