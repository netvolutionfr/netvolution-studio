# Jalon 2 — Tranche 1 : modèle de site v2

**Date :** 30/10/2026 · **Périmètre :** SB-A (étude jalon 2 §10), ADR-0007 · **Statut :** livré

## Livré

| Élément | Emplacement | Vérification |
|---|---|---|
| Schéma `ns.site` v2 : `settings` (`lang`, `homePageId`), `pages` (`id`, `title`, `slug`, `rootId`, `publish`), table de nœuds commune, breakpoints et médias au niveau du site | `core/src/document/schema.ts` | `load.test.ts` |
| Migrations séquentielles pures, `1 → 2` : la page devient l'accueil d'un site d'une page | `core/src/document/migrate.ts` | `load.test.ts`, banc (fixtures v1), document `data/` du jalon 1 rouvert |
| `loadSite` : version → migration → schéma → sémantique ; parcours multi-racines ; pages et slugs (unicité, accueil = slug vide, segments réservés) ; liens vers une page | `core/src/document/load.ts` | `load.test.ts` |
| Liens `{ kind: 'page', pageId }` résolus en `/slug/` au rendu (bouton, texte enrichi) | `core/src/document/links.ts`, `components/src/{button,text}` | `export.test.ts` |
| `resolve(props, { site, pageId })`, `pageRoots`, `toCss(site, registry, roots)`, `DocumentView({ site, pageId })` | `core/src/registry`, `core/src/style/css.ts`, `components/src/DocumentView.tsx` | banc |
| Commandes de pages : `createPage`, `updatePage`, `duplicatePage`, `removePage`, `movePage`, `setHomePage` ; page courante dans le store (`pageId`, `rootId`, `setPage`) | `core/src/editor/commands.ts`, `store.ts` | `store.test.ts` |
| Protocole `render { doc, pageId }` | `core/src/protocol/messages.ts`, canvas | e2e |
| Export multipage : par page publiée, `src/pages/<slug>.astro`, `src/page/<slug>.tsx`, `src/styles/<slug>.css` (`index` pour l'accueil) ; `<html lang>` du site ; pages non publiées exclues avec leurs composants et médias | `export-astro/src/generate.ts`, `write.ts` | `export.test.ts` |

## Choix faits pendant la tranche

- **Dossier conservé.** `core/document/` porte le modèle de site, plutôt qu'un nouveau `core/site/` : moins de churn, même frontière.
- **v2 minimale.** Layouts, menus, tokens, SEO et redirections arriveront comme champs optionnels de la v2 (addendum ADR-0007), pas comme tableaux vides figés dès maintenant.
- **Changement d'accueil = échange des slugs.** La nouvelle page d'accueil prend le slug vide, l'ancienne reprend le slug de la nouvelle.
- **Suppression d'une page liée refusée**, avec le nombre d'éléments qui la référencent. Un lien vers une page inexistante est une erreur de chargement, comme un média manquant.
- **Le changement de page ne passe pas par l'historique** : il vide la sélection. Après une annulation qui supprime la page affichée, le Studio revient à l'accueil.
- **Fichiers d'export renommés** : `src/page/Page.tsx` et `src/styles/page.css` deviennent `src/page/index.tsx` et `src/styles/index.css`. Le DOM est inchangé.

## Limites (levées en tranche 2)

- Pas d'interface de pages : le Studio édite la page d'accueil. Les commandes de pages ne sont accessibles que par le store et les tests.
- Le champ « Lien » et le texte enrichi ne savent saisir que des URL. Un lien vers une page, importé en JSON, s'affiche vide dans l'inspecteur ; le modifier le remplace par une URL.
- La persistance reste celle du jalon 1 (`data/documents/`, médias communs) : ADR-0008 en tranche 2.

## Vérifications

| Commande | Résultat |
|---|---|
| `npm run typecheck`, `npm run lint` | ✅ |
| `npm test` | 84 tests ✅ (68 au jalon 1 ; +16 : migration, pages, slugs, liens, commandes de pages, export multipage) |
| `npm run test:e2e` | 26/26 ✅ |
| `npm run test:fidelity` | 20/20 identiques (fixtures v1 migrées), 0 `<script>`, 0 violation grave ✅ |
| `npm run demo` | réussie, 4/4 largeurs identiques ✅ |
