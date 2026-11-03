# ADR-0013 — Couche de services : catalogue, lots et journal

**Statut :** Accepté le 30/10/2026 · **Date :** 30/10/2026 · **Réf. :** CS-09, CS-10, foundations §10, ADR-0003 ; étude jalon 3 §4.5

## Contexte

L'assistance IA (tranches 6 et 7) et les automatisations futures (MCP) doivent agir sur le site **par les mêmes commandes que l'interface**, avec :
- validation, autorisations explicites, effets décrits, annulation ;
- prévisualisation des changements, diff lisible ;
- journal des opérations.

Le modèle ne doit jamais être modifié en contournant les règles métier. Les commandes existent déjà : schémas zod, `apply` pur, validation complète par `loadSite` après chaque commande.

## Décision

1. **Catalogue** (`core/services/catalog.ts`). Chaque commande y est décrite comme un outil :
   - `name`, `description` (français), `inputSchema` (JSON Schema produit par `z.toJSONSchema` à partir du schéma zod des paramètres) ;
   - `permission`, `effects`, `undoable`, forme du résultat et des erreurs.

   La forme reprend celle des outils MCP. Aucun serveur MCP n'est exposé (CS-10), mais `GET /api/commands` publie le catalogue.
2. **Autorisations** : `content` (textes, liens, médias d'un élément), `design` (styles, tokens, animations), `structure` (arbre, composants, menus, layouts), `pages` (pages, adresses, SEO, redirections), `site` (réglages, médiathèque). Un appelant reçoit un ensemble d'autorisations : l'utilisateur du Studio a tout, l'assistant IA un sous-ensemble.
3. **Lots atomiques.** `runBatch(site, calls, ctx, permissions)` applique les appels sur une **copie**. Pour chaque appel, il vérifie que la commande existe, que l'autorisation est accordée et que les paramètres sont valides, puis applique la commande et valide entièrement le site. Au premier échec, le lot est refusé en entier avec l'indice et la raison. Le site d'origine n'est jamais modifié.
4. **Diff** : `diffSites(avant, après)` liste :
   - les éléments ajoutés et supprimés ;
   - pour chaque élément modifié, les propriétés et les styles changés (avec leur breakpoint, avant et après), ainsi que les autres changements (enfants, parent, animations, lien d'instance) ;
   - les champs du site modifiés.

   `summarize` le traduit en phrases françaises.
5. **Application** : `store.applyBatch(calls, label, origin)` rejoue un lot accepté en **une seule entrée d'historique**, donc une seule annulation.
6. **Journal** : chaque entrée d'historique est consignée avec l'horodatage, l'origine (`user` ou `ai`), le libellé, le nom des commandes et le **nombre** de changements, **jamais leur contenu**. Il est affiché dans le Studio (panneau « Journal »).

## Alternatives

- **Un format de « patch » propre à l'IA**, en JSON Patch sur le document : il contournerait les règles métier des commandes (contraintes d'imbrication, liens, composants) et dupliquerait la validation.
- **Un serveur MCP dès ce jalon** : hors périmètre (CS-10). Le catalogue en a déjà la forme.

## Conséquences

- Une nouvelle commande doit déclarer sa description, son autorisation et ses effets. Le typage l'impose : `META` est indexé par `CommandName`.
- Le journal calcule un diff à chaque enregistrement (coût linéaire en nombre d'éléments) : à surveiller sur de très gros sites.
