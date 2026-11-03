# Jalon 2 — Tranche 4 : menus, header/footer et aperçu du site

**Date :** 30/10/2026 · **Périmètre :** SB-03, SB-04, SB-09 (étude jalon 2 §4.2, §4.7, §9), ADR-0007 · **Statut :** livré

## Livré

| Élément | Emplacement | Vérification |
|---|---|---|
| Champs optionnels de la v2 : `layouts` (`header` / `footer`, une racine de la table de nœuds), `settings.defaultLayouts`, `page.layouts` (absent = défaut du site, `null` = aucun), `menus` (entrées vers une page ou une URL, un niveau de sous-entrées) | `core/src/document/schema.ts` | `layouts.test.ts` |
| `loadSite` : racines des layouts parcourues comme celles des pages, ids de layouts distincts des pages, choix de layout vers un layout du bon rôle (`missing-layout`), menus (ids, entrées, pages liées), champ `menu` des composants (`missing-menu`) | `core/src/document/load.ts` | `layouts.test.ts`, `components.test.ts` |
| `pageRoots` : header, page, footer ; un id de layout rend le layout seul. Canvas, export et banc suivent sans autre changement | `core/src/style/css.ts` | `layouts.test.ts`, banc |
| Commandes `createLayout` (devient le défaut de son rôle), `removeLayout`, `setPageLayout`, `setMenu`, `removeMenu` (refusée si une navigation l'affiche) ; `removePage` refusée si la page est dans un menu | `core/src/editor/commands.ts` | `layouts.test.ts` |
| Composant Navigation (`nav`) : `<nav><ul>` sémantique, `aria-current="page"`, entrée parente active, sous-menus au survol et au focus clavier, repli en bouton `<details>` sans JavaScript à partir d'un breakpoint (`breakpointCss`, nouveau point d'extension du registre) | `components/src/nav/` | `components.test.ts`, banc |
| Panneau Pages : section « Header et footer », création depuis une composition de départ (logo, navigation ; menu principal créé avec les pages publiées s'il n'en existe pas), en une seule étape d'annulation | `shell/Pages.tsx` | e2e |
| Édition d'un layout comme une page (`#/p/<projet>/header`) ; un clic sur le header ou le footer dans une page l'ouvre ; réglages de page « Afficher le header / le footer » ; réglages du layout (pages concernées, suppression) | `shell/Pages.tsx`, `shell/Canvas.tsx` | e2e |
| Panneau Menus : menus nommés, entrées (libellé, page ou URL), ordre, sous-entrée, suppression | `shell/Menus.tsx` | e2e (via l'aperçu) |
| Aperçu du site (`preview.html#/<projet>/<adresse>`), ouvert dans un onglet : mêmes vues et même CSS que l'export, liens internes navigables, menus, responsive réel, médias. Il reçoit en direct l'état de l'éditeur, enregistré ou non (`BroadcastChannel`), sinon la version enregistrée | `src/preview/main.tsx`, `shell/main.tsx` | e2e |
| Fixture `layouts.json` (4 pages, header avec sous-menu replié en tablette, footer, une page sans header), aussi proposée comme modèle | `fixtures/layouts.json` | banc : 28/28 identiques |

## Choix faits pendant la tranche

- **Pas de verrouillage des layouts dans une page** : un clic sur le header ouvre le header pour l'éditer, au lieu d'un état grisé. Les nœuds d'un layout n'apparaissent jamais dans l'arborescence d'une page.
- **Navigation sans JavaScript** : la barre et le menu replié contiennent la même liste, et une media query affiche l'une ou l'autre. La liste cachée est en `display: none`, donc absente de l'arbre d'accessibilité.
- **Aperçu côté navigateur** plutôt que par une route SSR du serveur de développement (étude §4.7). Le serveur n'a pas à exécuter de JSX, et l'aperçu montre aussi les modifications non enregistrées. Les liens internes y portent un préfixe `#/<projet>` (`RenderContext.basePath`) ; l'export n'en a pas.
- **Point d'extension `breakpointCss`** dans le registre : les règles qui dépendent des props et d'un breakpoint, comme le repli de la navigation, sont émises dans les media queries du site.
- **Un seul header et un seul footer dans l'interface.** Le modèle accepte plusieurs variantes par rôle (ADR-0007 [O]).

## Vérifications

| Commande | Résultat |
|---|---|
| `npm run typecheck`, `npm run lint` | sans erreur |
| `npm test` | 97/97 |
| `npm run test:e2e` | 30/30, dont « header et footer partagés sur 3 pages, masquables par page » et « aperçu : navigation par le menu, repli mobile sans JS, modifications non enregistrées » |
| `npm run test:fidelity` | 28/28 identiques (7 fixtures × 4 largeurs), 0 `<script>`, aucune violation grave |
| `npm run demo` | réussie |

## Limites

- **Sous-menus** : un seul niveau. En desktop, ils s'ouvrent au survol ou au focus et se ferment quand le focus sort ; il n'y a pas de fermeture par Échap (îlot JS éventuel, tranche 6).
- **Menu replié** : il s'ouvre dans le flux et pousse le contenu, sans superposition. Son libellé est configurable, il n'a pas d'icône.
- **Seuil de repli** limité aux breakpoints `tablet` et `mobile` des modèles.
- **Aperçu** : les ancres internes (`#section`) partagent le hash avec le routage de l'aperçu.
- **Variantes de header et footer** : présentes dans le modèle, pas dans l'interface.
- **Liens vers une page** : le signalement du changement de slug compte les éléments, pas les entrées de menu (elles suivent le slug elles aussi).
