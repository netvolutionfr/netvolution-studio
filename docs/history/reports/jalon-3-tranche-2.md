# Jalon 3 — Tranche 2 : modèles de site

**Date :** 30/10/2026 · **Périmètre :** CS-02 (étude jalon 3 §4.2) · **Statut :** livré

## Livré

| Élément | Emplacement | Vérification |
|---|---|---|
| Modèle de site = archive de projet (`ns.archive`, jalon 2) + `template { name, description }` ; modèles intégrés en lecture seule dans `templates/`, modèles de l'utilisateur dans `data/templates/` | `apps/studio/dev-server/api.ts` | `api.test.ts` |
| Routes : `GET /api/templates`, `POST /api/templates/:id/projects` (nouveau projet, nom au choix), `POST /api/projects/:id/template` (enregistrer comme modèle), `DELETE /api/templates/:id` (modèles de l'utilisateur seulement, vers la corbeille) ; import d'archive et constitution d'archive factorisés | `api.ts` | `api.test.ts` (création, médias, enregistrement, suppression, protection des modèles intégrés, identifiants refusés) |
| Modèle intégré **« Atelier Nord — site vitrine »** : 5 pages, header et footer, menu, design system, sections, galerie, 5 images de démonstration générées (libres, JPEG), 178 Ko | `templates/atelier-nord.json`, régénéré par `npm run templates:build` | e2e, `api.test.ts` |
| Écran Projets : choix entre « Pages de départ » et « Sites complets », liste « Mes modèles de site » avec suppression ; menu du projet : « Enregistrer comme modèle de site… » | `shell/Projects.tsx`, `DocumentBar.tsx` | e2e |

## Choix faits pendant la tranche

- **Aucun format nouveau.** Un modèle est une archive : il passe par les mêmes contrôles qu'un import (validation du site, type, taille et signature de chaque média, politique SVG). L'utilisateur peut ensuite tout remplacer progressivement.
- **Modèle intégré produit par la démonstration.** `templates/atelier-nord.json` est l'archive du site construit dans l'interface par `demo:site`. Le régénérer garantit qu'il reste conforme au Studio courant.
- **Images de démonstration en JPEG** (au lieu de PNG), pour un modèle léger dans le dépôt. Elles sont optimisées à l'export comme toute image.
- **« Enregistrer comme modèle » part de la version enregistrée**, comme l'archive. Le Studio demande confirmation si des modifications ne sont pas enregistrées.

## Vérifications

| Commande | Résultat |
|---|---|
| `npm run typecheck`, `npm run lint` | sans erreur |
| `npm test` | 145/145 |
| `npm run test:e2e` | 35/35, dont « projet complet créé depuis Atelier Nord, exporté sans erreur » |
| `npm run test:fidelity` | 44/44 identiques |
| `npm run demo` | réussie |
| `npm run templates:build` (démonstration du site + écriture du modèle) | réussie : 0 erreur, 0 avertissement |

## Limites

- **Saisie à l'enregistrement** : le nom et la description se saisissent dans des boîtes de dialogue simples (`prompt`). Le modèle n'a pas de vignette.
- **Modèles partagés** : ils ne sont pas partagés entre installations du Studio, sauf en copiant le fichier dans `data/templates/` ou `templates/`.
- **Composants partagés** d'un modèle : ils viennent avec le projet créé, mais ne se partagent pas entre projets.
