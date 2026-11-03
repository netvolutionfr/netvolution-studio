# Jalon 2 — Tranche 2 : projets et pages

**Date :** 30/10/2026 · **Périmètre :** SB-01, SB-02 (étude jalon 2 §9), ADR-0008 · **Statut :** livré

## Livré

| Élément | Emplacement | Vérification |
|---|---|---|
| Adaptateur par projet : `data/projects/<id>/site.json` + `media/`, id `p` + 10 caractères généré par le serveur ; routes `GET/POST /api/projects`, `GET/PUT/DELETE /api/projects/:id`, `POST …/duplicate`, `…/media`, `…/export` ; suppression = déplacement dans `data/trash/` | `apps/studio/dev-server/api.ts` | `api.test.ts` |
| Médias isolés par projet, servis en `/media/<projectId>/<fichier>` ; à la création depuis un modèle ou un import, les médias référencés sont copiés depuis les sources en lecture seule (`fixtures/media`) | `api.ts`, `RenderContext.mediaBase`, protocole `render { mediaBase }` | `api.test.ts`, e2e (image chargée dans le canvas) |
| Écran Projets (`#/projects`) : créer depuis un modèle avec un nom, importer un JSON (v1 accepté et migré), ouvrir, dupliquer, supprimer avec confirmation | `shell/Projects.tsx`, `shell/main.tsx` | e2e |
| Éditeur à l'URL `#/p/<projet>/<page>` : la page affichée suit l'URL et inversement ; confirmation avant de quitter un projet modifié | `shell/main.tsx` | e2e (rechargement) |
| Panneau Pages : liste (accueil, adresse, non publiée), sélection, ajout | `shell/Pages.tsx` | e2e |
| Réglages dans l'inspecteur quand rien n'est sélectionné. Page : titre, slug, publication, monter/descendre, dupliquer, supprimer, définir l'accueil. Site : nom, langue, URL canonique | `shell/Pages.tsx`, commande `updateSite`, `settings.siteUrl` | `store.test.ts`, e2e |
| Signalement des liens concernés par un changement de slug (nombre d'éléments qui lient la page) | `PageSettings` (`pageReferences`) | e2e |
| Champ « Lien » : URL ou page du site ; texte enrichi : une adresse `/slug/` saisie devient un lien vers la page, et les liens de page sont conservés à l'édition | `PropFields.tsx`, `RichTextField.tsx` | e2e |

## Choix faits pendant la tranche

- **Id du site = id du projet.** Le serveur impose `site.id` à la création et à la duplication ; un `PUT` dont l'id diffère de l'URL est refusé.
- **Création côté serveur seulement.** Un modèle ou un import devient immédiatement un projet enregistré : l'état « document jamais enregistré » du jalon 1 disparaît, et l'écriture exige toujours `If-Match`.
- **Préfixe des médias dans le contexte de rendu** (`mediaBase`, défaut `/media/`). L'export et le banc de fidélité gardent `/media/<fichier>` ; seul le Studio sert les médias sous le préfixe du projet.
- **`siteUrl` limité à une origine** (`https://exemple.fr`, sans chemin), champ optionnel de la v2 : pas de migration.
- **Signalement du slug par le nombre de références.** Les liens d'URL ne peuvent pas viser une adresse interne relative (`hrefSchema`), donc seuls les liens de page sont concernés, et ils suivent le slug.
- **Pas de dialogue « Paramètres du projet » séparé** : les réglages du site sont dans l'inspecteur, sous ceux de la page.

## Vérifications

| Commande | Résultat |
|---|---|
| `npm run typecheck`, `npm run lint` | sans erreur |
| `npm test` | 86/86 |
| `npm run test:e2e` | 28/28, dont « site de 3 pages liées : créer, lier, renommer un slug, recharger » |
| `npm run test:fidelity` | aucun écart |
| `npm run demo` | réussie, 4/4 largeurs identiques |

## Limites et points ouverts

- **Archive projet (SB-12) reportée à la tranche 7** avec l'export complet : l'« Exporter JSON » fournit `site.json` sans les médias. Un import dont les médias sont introuvables est accepté, avec un avertissement.
- **Données du jalon 1.** Les documents `data/documents/*.json` ne sont plus listés : il faut les importer depuis l'écran Projets (ADR-0008 §8). Leurs médias, dans `data/media/`, ne sont pas copiés automatiquement.
- **Corbeille** jamais vidée par le Studio, et pas de restauration depuis l'interface.
- **Métadonnées de page** limitées au titre : description et SEO en tranche 7 (SB-08).
- **Réorganisation des pages** par boutons Monter et Descendre, sans glisser-déposer.
