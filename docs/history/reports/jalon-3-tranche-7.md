# Jalon 3 — Tranche 7 : assistance IA éditoriale et design

**Date :** 30/10/2026 · **Périmètre :** CS-08, CS-09 (étude jalon 3 §4.7), ADR-0013, ADR-0014 · **Statut :** livré

## Livré

| Élément | Emplacement | Vérification |
|---|---|---|
| **Outils de l'assistant** : 8 commandes du catalogue (props, styles, insertion d'arbre, déplacement, suppression, renommage, animations, page) ; autorisations `content`, `design`, `structure`, `pages` | `core/src/ai/assistant.ts` | `assistant.test.ts` |
| **Requête** : consigne, métadonnées de la page, sélection (ou page) en arbre, types de composants, noms des tokens et breakpoints ; jamais les autres pages, les médias ni les réglages ; taille bornée | `buildAiRequest` | `assistant.test.ts` |
| **Proposition** : les appels d'outils forment un lot vérifié sur une copie (`runBatch`, atomique) ; refus des commandes hors liste, de la publication et du changement d'adresse, des réponses tronquées ; une réponse sans changement est une simple suggestion | `proposalFrom` | `assistant.test.ts` |
| **Panneau Assistant IA** : demandes types (titre, reformuler, résumer, ton, SEO, structure depuis un brief, témoignages, 2 colonnes sur tablette, espacements, variante sobre, palette), consigne libre, ce qui est envoyé, revue du diff, **Accepter** (une annulation, origine « IA » au journal) / **Rejeter** (aucune trace) | `shell/Assistant.tsx`, `Review.tsx` | e2e |
| **Fournisseur simulé** scénarisé (SEO, section de témoignages, colonnes sur tablette, titre) pour les tests et la démonstration | `dev-server/ai/simulated.ts` | `assistant.test.ts`, e2e |

## Choix faits pendant la tranche

- **Un seul tour** : la réponse du modèle (appels d'outils) est la proposition. Les identifiants créés par `insertTree` ne sont donc pas réutilisables dans le même lot ; une section s'ajoute en un seul arbre.
- **Revérification à l'acceptation** : `applyBatch` rejoue le lot sur le site du moment ; une proposition devenue invalide (site modifié entre-temps) est refusée.
- **Journal sans la consigne** : elle peut citer les textes du client. Le libellé est « Proposition de l'assistant ».
- **Le contexte est une donnée** : le prompt système précise que les textes du site ne sont jamais des instructions. Quoi qu'il en soit, tout passe par la validation des commandes et par la revue humaine.

## Vérifications

| Commande | Résultat |
|---|---|
| `npm run typecheck`, `npm run lint` | sans erreur |
| `npm test` | 170/170 |
| `npm run test:e2e` | 38/38 (rejet sans trace, acceptation, journal « IA », une annulation) |
| `npm run test:fidelity` | aucun écart |
| `npm run demo`, `npm run demo:site` | réussies |

## Limites

- **Pas d'aperçu dans le canvas** avant acceptation : la revue est un diff en phrases. Pour voir le résultat, il faut accepter puis annuler si besoin.
- **Un seul tour**, sans conversation ni correction automatique d'un lot refusé : il faut relancer la demande.
- **Qualité des propositions réelles non mesurée** : les tests utilisent le fournisseur simulé, et aucune évaluation n'a été faite avec un vrai modèle.
- **Diff global pour les pages** : le SEO proposé apparaît comme « pages modifié », sans le détail des champs.
