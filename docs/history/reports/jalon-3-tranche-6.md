# Jalon 3 — Tranche 6 : fournisseurs d'IA

**Date :** 30/10/2026 · **Périmètre :** CS-11, CS-08 (socle) (étude jalon 3 §4.6), ADR-0014 · **Statut :** livré

## Livré

| Élément | Emplacement | Vérification |
|---|---|---|
| **Contrat neutre** : requête, réponse, appels d'outils, usage, erreurs typées, tailles bornées, schéma de validation | `core/src/ai/contract.ts` | `ai.test.ts`, `api.test.ts` |
| **Anthropic** par le SDK officiel (1.3.0 figé) : `claude-opus-5-5`, outils, repli côté serveur par défaut, refus, réponse tronquée, erreurs typées → codes | `dev-server/ai/anthropic.ts` | `ai.test.ts` (serveur factice : forme de la requête, 401/429/400/529) |
| **Compatible OpenAI** (OpenAI, Mistral, Ollama, LM Studio…) par `fetch` | `dev-server/ai/openai.ts` | `ai.test.ts` |
| **Simulé**, déterministe, sans réseau | `dev-server/ai/simulated.ts` | `ai.test.ts`, `api.test.ts` |
| **Service** : configuration par l'environnement (`.env`, `.env.example`), plafond de jetons, requêtes par minute, budget quotidien, journal local **sans contenu** | `dev-server/ai/service.ts`, `vite.config.ts` | `ai.test.ts` |
| Routes `GET /api/ai/status` (sans clé) et `POST /api/ai/complete` (validation, codes HTTP) | `dev-server/api.ts` | `api.test.ts` (simulé → 200, invalide → 400, désactivé → 503) |
| Panneau **Assistant IA** : état, fournisseur, limites, consommation, mode d'activation | `shell/Assistant.tsx` | typecheck, e2e existants |
| Confidentialité : aucune clé dans le code du Studio ni dans les exports | — | `ai.test.ts` (analyse statique), `api.test.ts` (export analysé) |

## Choix faits pendant la tranche

- **SDK officiel pour Anthropic, `fetch` pour l'adaptateur compatible OpenAI** : un seul SDK, côté serveur ; aucune bibliothèque d'abstraction.
- **Repli côté serveur activé par défaut** : un refus du modèle principal est rejoué sur un modèle de repli plutôt que d'échouer.
- **Choix de l'outil laissé au modèle** : l'assistant peut répondre par du texte (question, refus argumenté) plutôt que par un lot.
- **Désactivé par défaut** : sans `.env`, le Studio fonctionne comme avant.

## Vérifications

| Commande | Résultat |
|---|---|
| `npm run typecheck`, `npm run lint` | sans erreur |
| `npm test` | 166/166 |
| `npm run test:e2e` | 37/37 |
| `npm run test:fidelity` | aucun écart |
| `npm run demo`, `npm run demo:site` | réussies |

## Limites

- **Pas encore de propositions** : le panneau n'affiche que l'état ; les transformations (textes, design, structure), leur revue et leur application arrivent en tranche 7.
- **Compteurs en mémoire** : le budget quotidien repart à zéro au redémarrage, et il n'y a pas de quotas par utilisateur (pas de comptes).
- **Pas de diffusion en continu** : les réponses arrivent d'un bloc, dans la limite de `NS_AI_MAX_TOKENS`.
- **Fournisseurs réels non testés en intégration continue** : ils sont vérifiés contre des serveurs factices ; un essai réel demande une clé.
