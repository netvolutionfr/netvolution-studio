# ADR-0003 — Commandes, transactions et historique

**Statut :** Accepté le 29/10/2026 · **Date :** 29/10/2026 · **Réf. :** 00 §8, §10, VE-05, VE-09 ; étude §7

## Contexte

Toutes les modifications doivent passer par des opérations structurées, réutilisables plus tard par l'IA/MCP, avec undo/redo cohérent et un slider = une action logique.

## Décision recommandée

1. **Commande** = `{ name, params: ZodSchema, apply(doc, params, ctx) → Result<Doc, CommandError> }`, pure et déterministe (`ctx` fournit registre et générateur d'ids).
2. Le document est **immuable** ; seules les commandes produisent un nouveau document.
3. **`EditorStore`** (TS pur, dans `core`) : `getState`, `subscribe`, `dispatch`, `begin/commit/cancel`, `undo/redo`, `load`, `markSaved`. Liaison React via `useSyncExternalStore`.
4. **Historique par instantanés** : entrée `{ label, command, params, before, after }` ; undo/redo restaurent `before`/`after` ; partage structurel ⇒ coût mémoire faible ; limite configurable (100 entrées).
5. **Transactions** : hors transaction, chaque `dispatch` crée une entrée ; dans une transaction, les `dispatch` mettent à jour l'aperçu sans entrée, `commit` en crée une seule (`before` = état au `begin`), `cancel` restaure.
6. Le **journal** des commandes appliquées (nom + params) est conservé dans les entrées : base de la traçabilité exigée au jalon 3.
7. La sélection est hors document et hors historique [O].

## Alternatives

- **Commandes inverses** : mémoire minimale, mais chaque commande doit fournir une inverse correcte et testée ; plus de surface d'erreur.
- **Patchs (Immer/JSON Patch)** : utiles pour la collaboration ou des diffs fins ; non requis (collaboration hors périmètre). Upgrade possible sans changer l'API des commandes.
- **Bibliothèque d'état (Zustand, Redux)** : n'apporte rien au-delà d'un store de ~100 lignes.

## Conséquences

- Les commandes sont testables sans UI (livrable VE-B).
- Les schémas de params serviront de définitions d'outils IA/MCP au jalon 3.

## Points ouverts

- [O] Sélection restaurée par undo (confort) ou non (simplicité).
- [O] Coalescence de saisie texte : délai d'inactivité (500 ms recommandé) vs blur seul.
