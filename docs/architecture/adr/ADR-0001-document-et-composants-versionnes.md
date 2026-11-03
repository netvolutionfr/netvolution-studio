# ADR-0001 — Document et composants versionnés

**Statut :** Accepté le 29/10/2026 · **Date :** 29/10/2026 · **Réf. :** 00 §5, VE-02, VE-03 ; étude §3–4

## Contexte

Le document est la source de vérité (pas le HTML). Il doit être sérialisable, validé aux frontières, versionné, indépendant de React/Astro/CMS, et préparer le site multipage (jalon 2) et les commandes IA (jalon 3).

## Décision recommandée

1. **Enveloppe** `{ schemaVersion: 1, kind: 'ns.page', id, title, breakpoints, rootId, nodes, assets }`.
2. **Table plate** `nodes: Record<NodeId, Node>` avec `children: NodeId[]` ; parent dérivé en mémoire.
3. **Node** `{ id, type, name?, props, style, children }` ; `id` = `/^n[a-z0-9]{8,}$/` (stable, sûr comme classe CSS), généré par `crypto.getRandomValues`.
4. **Styles typés** en liste blanche, valeurs structurées ; responsive `{ base, [breakpointId] }`, héritage desktop-first vers le breakpoint plus large le plus proche.
5. **Breakpoints = données** du document (`{ id, label, maxWidth }`), nombre non limité.
6. **Texte riche** en `Inline[]` (gras, italique, lien) ; aucun HTML. Liens en union discriminée (`kind: 'url'` au jalon 1).
7. **Médias** référencés par `assetId` ; aucun chemin d'hébergement dans les props.
8. **Versions** : `schemaVersion` global + `version` par définition de composant. `loadDocument(json)` : version future → refus `unsupported-version` ; version antérieure → migrations séquentielles pures ; puis validation Zod, puis validation sémantique (références, parent unique, cycle, imbrication autorisée par le registre, props valides) → `Diagnostic { code, path, message, nodeId? }[]`.
9. **Schémas Zod** comme source unique des types TS, de la validation et (plus tard) du JSON Schema.

## Alternatives

- **Arbre imbriqué** (illustration 00 §5) : plus lisible, mais unicité des ids et déplacements moins sûrs ; tout déplacement recopie des sous-arbres. Conserver comme *vue* (`toTree()`) pour diagnostic/IA.
- **Styles en chaînes CSS libres** : souples mais injectables et non inspectables. Rejeté.
- **HTML pour le texte riche** : impose un assainisseur et des surprises de rendu. Rejeté.
- **Champ `design.tokens` dès le jalon 1** : YAGNI ; l'ajout futur d'une valeur `{ token }` est rétrocompatible.

## Conséquences

- Les commandes manipulent des ids, jamais des chemins d'arbre.
- La validation sémantique dépend du registre : `loadDocument(json, registry)`.
- Types inconnus : chargement refusé avec diagnostic (pas de nœud « fantôme ») au jalon 1.

## Points ouverts

- [O] Table plate vs arbre imbriqué (recommandation : plate).
- [O] Desktop-first (recommandé, familier Tatsu) vs mobile-first.
- [Réglé] Passage `ns.page` → `ns.site` : ADR-0007, migration v1 → v2 livrée au jalon 2 (tranche 1).
- [O] Classe `ns-<id>` vs `data-ns-id` pour identifier les nœuds dans le canvas.
