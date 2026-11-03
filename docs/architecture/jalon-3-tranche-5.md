# Jalon 3 — Tranche 5 : couche de services

**Date :** 30/10/2026 · **Périmètre :** CS-10, CS-09 (journal, diff) (lot CS-F ; étude jalon 3 §4.5), ADR-0013 · **Statut :** livré

## Livré

| Élément | Emplacement | Vérification |
|---|---|---|
| **Catalogue des commandes** (36) : description, JSON Schema des paramètres (`z.toJSONSchema`), autorisation, effets, annulable, forme du résultat ; forme d'outil MCP ; publié par `GET /api/commands` | `core/src/services/catalog.ts`, `dev-server/api.ts` | `services.test.ts`, `api.test.ts` |
| Autorisations `content`, `design`, `structure`, `pages`, `site` ; un lot dépassant les autorisations de l'appelant est refusé | `catalog.ts`, `batch.ts` | `services.test.ts` |
| **`runBatch`** : application d'un lot sur une copie, vérification de chaque appel (commande connue, autorisation, paramètres, validation complète), **refus atomique** au premier échec avec l'indice et la raison | `core/src/services/batch.ts` | `services.test.ts` |
| **`diffSites`** (ajouts, suppressions, propriétés et styles avant/après par breakpoint, enfants, parent, animations, lien d'instance, champs du site) et `summarize` (phrases) | `batch.ts` | `services.test.ts` (diff exact) |
| `store.applyBatch` : un lot accepté = **une** entrée d'historique (une annulation) ; **journal** des opérations (horodatage, origine vous/IA, libellé, commandes, nombre de changements, jamais de contenu) | `core/src/editor/store.ts` | `services.test.ts`, e2e |
| Studio : boîte de **revue** réutilisable (changements, Appliquer / Rejeter) utilisée pour la mise à jour des instances (remplace le simple résumé de la tranche 1) ; panneau **Journal des opérations** | `shell/Review.tsx`, `Symbols.tsx`, `Journal.tsx` | e2e |

## Choix faits pendant la tranche

- **Pas de format de patch propre à l'IA** : tout passe par les commandes métier, donc par leurs règles (imbrication, liens, composants) et la validation complète (ADR-0013).
- **Journal sans contenu** : les noms de commandes et le nombre de changements suffisent à tracer, sans exposer les textes du site. Le diff détaillé ne sert qu'à la revue, à l'écran.
- **Revue avant application** : le diff est calculé sur une copie (`runBatch`). Rejeter ne laisse aucune trace.

## Vérifications

| Commande | Résultat |
|---|---|
| `npm run typecheck`, `npm run lint` | sans erreur |
| `npm test` | 158/158 |
| `npm run test:e2e` | 37/37 (revue avec diff et éléments laissés de côté, journal sans contenu) |
| `npm run test:fidelity` | 52/52 identiques |
| `npm run demo`, `npm run demo:site` | réussies |

## Limites

- **Journal** : il vit le temps de la session de l'éditeur, sans persistance. Il ne consigne ni les annulations ni les rétablissements.
- **Diff** : il compare des champs entiers au niveau du site (pages, tokens, menus…). Il ne détaille pas, par exemple, quel token a changé.
- **Autorisations** : elles ne sont pas encore reliées à des comptes (hors périmètre). L'assistant IA recevra un sous-ensemble fixe en tranche 6.
