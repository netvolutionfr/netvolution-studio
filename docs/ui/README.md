# Design system du Studio

**Portée :** interface de l'éditeur uniquement (`apps/studio/src/ui/`, `apps/studio/src/shell/`). Les sites exportés et le canvas n'en dépendent pas, ce que vérifie `apps/studio/src/isolation.test.ts`. Décision : [ADR-0006](../architecture/adr/ADR-0006-design-system-studio.md).

## 1. Audit initial (29/10/2026)

| Zone | Constat |
|---|---|
| Styles | Un seul `shell.css` (456 lignes, 80 règles) avec 8 variables de couleur seulement, et des couleurs en dur dans le canvas. Thème clair implicite, pas de thème sombre. Pas d'échelle typographique ni d'espacements. |
| Barre d'outils | Boutons texte (Enregistrer, Importer JSON, Exporter JSON, Exporter Astro, Annuler, Rétablir, Aperçu, Desktop, Tablette, Mobile) sur une ou deux lignes. Notifications intercalées dans la barre. |
| Bibliothèque | Boutons texte en ligne, sans icône. |
| Arborescence | Libellé suivi du type en texte ; chevrons ▾/▸ en caractères. |
| Inspecteur | Libellés au-dessus de chaque contrôle (peu dense), actions en boutons texte, sections non repliables. Textes « défini · réinitialiser » / « hérité » à côté des libellés. Selects pour tous les choix. |
| Texte enrichi | Boutons « Gras », « Italique », « Lien », « Retirer le lien » en texte. |
| États | Hover, focus et disabled minimaux ; pas de sélection marquée dans les contrôles groupés. |

Captures avant/après : voir §5.

## 2. Tokens (`ui/tokens.css`)

Les composants n'utilisent que des tokens sémantiques. Un thème se résume donc à un bloc d'override : `:root` pour le sombre (défaut), `:root[data-theme='light']` pour le clair.

| Famille | Tokens |
|---|---|
| Surfaces | `--bg-app` (fond du canvas), `--bg-panel`, `--bg-elevated` (menus, tuiles), `--bg-hover`, `--bg-active`, `--bg-input` |
| Traits | `--border`, `--border-strong` |
| Texte | `--text`, `--text-muted`, `--text-subtle` (contraste ≥ 4,5:1 sur les surfaces de panneau) |
| Accent | `--accent` et `--accent-fg` (surfaces pleines, ≥ 4,5:1), `--accent-text` (texte sur panneau), `--accent-soft` (sélection) |
| États | `--danger`, `--danger-bg`, `--success`, `--warning`, `--focus-ring` |
| Canvas | `--overlay-hover`, `--overlay-selected` |
| Typographie | `--font-ui` (polices système), `--font-mono` ; tailles `--text-xs` 11, `--text-sm` 12, `--text-md` 13, `--text-lg` 14 ; `--leading` 1,4 ; graisses 500 / 600 |
| Espacements | Grille de 4 px avec demi-pas : `--space-1` 2 … `--space-7` 24 |
| Dimensions | `--control-h` 28, `--control-h-sm` 24, `--toolbar-h` 44 |
| Rayons | `--radius-sm` 4, `--radius-md` 6, `--radius-lg` 8 |
| Ombres | `--shadow-popover`, `--shadow-frame` |
| Mouvement | `--transition` 120 ms, ramené à 0 avec `prefers-reduced-motion`. Les transitions sont aussi coupées pendant un changement de thème (`.no-transitions`). |

## 3. Primitives (`ui/`)

| Primitive | Rôle | Comportement |
|---|---|---|
| `Button` | Bouton texte, variantes `default`, `ghost`, `primary`, `danger`, tailles `sm`/`md`, icône optionnelle | Natif `<button>` |
| `IconButton` | Bouton icône seule | `label` obligatoire : nom accessible et infobulle (avec raccourci) |
| `Tip` | Infobulle | Radix Tooltip : survol **et** focus clavier, Échap |
| `Segmented` | Choix unique compact (largeur d'aperçu, direction, alignement du texte) | Radix ToggleGroup : sémantique radio, flèches (focus itinérant asynchrone) ; infobulle native `title` |
| `Menu` | Menu déroulant à déclencheur icône | Radix DropdownMenu : flèches, recherche par frappe, Échap, retour du focus |
| `Section` | Section repliable de l'inspecteur | `<details>`/`<summary>` natifs |
| `Field` | Ligne d'inspecteur : libellé à gauche, contrôle, action | Pastille d'état « défini / hérité » avec alternative textuelle ; variante empilée |
| `icons.ts` | Icône par type de composant et par composition | `lucide-react`, `aria-hidden` |

**Règles d'usage**

- Pas de couleur en dur dans `shell.css`. Seul `#ffffff` est admis, pour le fond de la page et le texte du libellé d'overlay, qui reposent sur le site lui-même ; un test le vérifie.
- Une action sans texte visible passe par `IconButton`, pour qu'elle ait toujours un nom et une infobulle.
- Le nom accessible d'un contrôle avec texte visible doit contenir ce texte (WCAG 2.5.3, vérifié par axe).
- Pas d'infobulle Radix sur un élément qui porte déjà un `data-state` Radix (items de ToggleGroup) : les attributs entrent en collision.
- Nouvelle primitive : seulement si elle sert à au moins deux endroits, ou si elle apporte un comportement accessible.

## 4. Vérifications

| Vérification | Résultat |
|---|---|
| `npm run check` | 71 tests unitaires, dont l'isolation : canvas sans UI ni icônes ni Radix, gabarit d'export et composants inchangés, tokens confinés |
| `npm run test:e2e` | 26/26 ; s'y ajoutent l'infobulle avec raccourci, le contrôle segmenté au clavier et le thème clair audité par axe |
| Accessibilité | axe (WCAG 2.1 AA, violations graves) : 0 en thème sombre comme en thème clair |
| `npm run test:fidelity` | 20/20 identiques : rendu et export non affectés |
| `npm run demo` | Réussie |
| Bundle | Les icônes et Radix ne sont que dans le bundle du shell (`index-*.js` : 159 Ko, 51 Ko gzip, contre 20 Ko avant). Le bundle du canvas n'a pas changé. |

Problèmes trouvés en cours de route :

- Contraste du libellé d'overlay : `--overlay-selected` assombri.
- Transitions de couleur captées par axe pendant le changement de thème : coupées pendant la bascule.
- Collision `data-state` entre Tooltip et ToggleGroup, qui annulait l'état sélectionné visuel.
- Champ texte écrasé en disposition empilée.
- Tuiles de composition tronquées.

## 5. Captures (1440 × 900, `node tests/e2e/screens.ts <préfixe>`)

| État | Avant | Après |
|---|---|---|
| Titre sélectionné | ![](avant-1-titre.png) | ![](apres-1-titre.png) |
| Conteneur (layout) | ![](avant-2-layout.png) | ![](apres-2-layout.png) |
| Mobile, texte enrichi | ![](avant-3-mobile-texte.png) | ![](apres-3-mobile-texte.png) |
| Glisser-déposer | ![](avant-4-glisser.png) | ![](apres-4-glisser.png) |
| Thème clair | — | ![](apres-5-theme-clair.png) |

## 6. Limites et suites

- **Selects natifs** stylés, rendus par le système une fois ouverts. Un Radix Select n'apporterait qu'une cohérence visuelle, au prix d'une dépendance de plus.
- **Thème** non synchronisé avec `prefers-color-scheme` : choix explicite, mémorisé.
- **Champ couleur.** Le sélecteur natif n'affiche ni alpha ni palette ; la palette viendra avec les design tokens du jalon 2.
- **Espacements** en grille de champs. Un widget « boîte » façon Figma reste possible.
