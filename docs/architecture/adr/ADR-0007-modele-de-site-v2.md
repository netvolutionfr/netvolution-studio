# ADR-0007 — Modèle de site v2

**Statut :** Accepté le 30/10/2026 · **Date :** 30/10/2026 · **Réf. :** SB-01 à SB-05, SB-12, ADR-0001 ; étude jalon 2 §4.1–4.2

## Contexte

Le jalon 1 manipule un document `ns.page` v1 autonome. Le jalon 2 exige un site multipage : pages et slugs, layouts partagés (header, footer), menus, tokens, médias communs, redirections. ADR-0001 prévoyait le passage `ns.page` → `ns.site` par migration.

## Décision recommandée

1. **Un document `ns.site` (schemaVersion 2) par projet**, sérialisé dans un seul fichier.
2. **Table de nœuds globale** `nodes: Record<NodeId, Node>` partagée par les pages et les layouts ; chaque page et chaque layout désigne sa racine (`rootId`). Chaque nœud est atteint exactement une fois depuis une racine.
3. `breakpoints`, `assets` et `tokens` au niveau du site.
4. `pages: Page[]` (ordre du Studio), `Page = { id, title, slug, rootId, publish, layouts?, seo }` ; slug vide = page d'accueil désignée par `settings.homePageId`. Slugs uniques, segments réservés refusés.
5. `layouts: Layout[]` (`role: 'header' | 'footer'`), défauts dans `settings.defaultLayouts`, surcharge ou `null` par page.
6. `menus: Menu[]` séparés des pages, profondeur ≤ 2 ; entrées avec `Link`.
7. `Link = { kind: 'url', href } | { kind: 'page', pageId, anchor? }` ; validation sémantique : `pageId` existant.
8. `redirects: { from, to: Link, status: 301 | 302 }[]`.
9. **Migration v1 → v2** pure et testée : la page devient l'accueil d'un site d'une page ; breakpoints et assets remontés ; aucun layout ni menu.
10. `loadSite(input, registry)` remplace `loadDocument` : version (future → refus) → migrations séquentielles → schéma Zod → sémantique.
11. `ComponentDefinition.resolve(props, ctx)` reçoit `ctx = { site, pageId }`.

## Alternatives

- **Un fichier par page + `site.json`** : sauvegardes plus petites et édition concurrente par page possible, mais plusieurs ETags, une validation croisée entre fichiers, un historique qui doit coordonner plusieurs documents et une sauvegarde non atomique. Prématuré pour un site vitrine mono-utilisateur. Reste possible derrière le port de persistance (ADR-0008).
- **Une table de nœuds par page** : isolation plus forte, mais les commandes et le presse-papiers doivent connaître la page, et les classes `ns-<id>` peuvent entrer en collision dans une feuille commune.
- **Arbre imbriqué** (illustration 00 §5) : déjà écarté par ADR-0001.

## Conséquences

- Les commandes de nœuds du jalon 1 restent inchangées ; seuls leur type de document et `toCss` (racines explicites) évoluent.
- Le canvas reçoit le site et la page courante, et rend `header + page + footer`.
- Plafond connu : un `site.json` de plusieurs Mo ralentit la sauvegarde et la validation. Il faudra alors découper par page.
- Les fixtures v1 restent valides via la migration ; le banc de fidélité les exerce donc à chaque exécution.

## Addendum (tranche 1 du jalon 2, 30/10/2026)

- La v2 livrée contient `settings` (`lang`, `homePageId`) et `pages`. Layouts, menus, tokens, SEO et redirections seront ajoutés comme champs **optionnels** de la v2 dans leurs tranches. Un fichier v2 plus ancien restera donc valide sans migration.
- Slugs réservés : premier segment `404` ou `media`, et tout segment `index` (collision avec `src/pages/<slug>/index.astro`).
- Détail : `docs/architecture/jalon-2-tranche-1.md`.

## Points ouverts

- [O] Variantes de layouts dans l'interface (le modèle les accepte, l'UI du jalon se limite à un header et un footer principaux).
- [O] Ancres de page (`anchor`) : id de nœud ou identifiant HTML saisi.

## Addendum — tranche 4 (30/10/2026)

Champs optionnels ajoutés à la v2, sans migration : `layouts` (`{ id, name, role, rootId }`), `settings.defaultLayouts`,
`page.layouts` (`header` / `footer` : absent = défaut du site, `null` = aucun) et `menus` (entrées `{ id, label, link }`,
un niveau de `children`). Les ids de layouts partagent l'espace des ids de pages, car l'éditeur ouvre l'un ou l'autre.
