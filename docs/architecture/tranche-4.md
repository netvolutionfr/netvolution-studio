# Tranche 4 — Persistance, médias, image et export depuis l'interface

**Date :** 29/10/2026 · **Périmètre :** T15, T16, T17, composant `image`

## Livré

| Élément | Emplacement | Vérification |
|---|---|---|
| API de développement : documents, médias, export | `apps/studio/dev-server/api.ts` (monté par `vite.config.ts`) | `api.test.ts` (7 tests) |
| Client API, session de persistance (ETag, état, erreurs) | `apps/studio/src/shell/{api,persistence}.ts` | e2e |
| Barre de document : ouvrir, nouveau depuis un modèle, enregistrer (⌘S), importer/exporter JSON, exporter Astro | `apps/studio/src/shell/DocumentBar.tsx` | e2e |
| Composant `image` : média par identifiant, `alt` obligatoire sauf image décorative, ajustement, chargement | `packages/components/src/image/` | tests, banc |
| Étape `resolve` partagée canvas/export : props du document → props de la vue | `ComponentDefinition.resolve`, `viewProps()` | banc |
| Champ `asset` : sélection, envoi, réutilisation d'un média | `apps/studio/src/shell/AssetField.tsx` | e2e |
| Contrôle `missing-asset` au chargement ; commande `addAsset` ; propriété de style `height` | `packages/core` | tests |
| Copie des médias utilisés dans `public/media/` à l'export | `packages/export-astro/src/write.ts` | tests, banc, e2e |
| Image de référence et nœuds image dans `fixtures/elements.json` | `fixtures/media/` | banc |

## API de développement (ADR-0004)

| Route | Rôle |
|---|---|
| `GET /api/documents` | Liste (id, titre, date) |
| `GET /api/documents/:id` | Document + `ETag` |
| `PUT /api/documents/:id` | Création avec `If-None-Match: *`, mise à jour avec `If-Match: <etag>`. Sans l'un des deux : 428. Version plus récente sur le serveur : 412 |
| `POST /api/media?width=&height=` | Image brute ; signature vérifiée contre le `Content-Type` ; 10 Mo max. |
| `GET /media/:file` | Médias (`data/media/`, puis `fixtures/media/`), avec `nosniff` |
| `POST /api/export` | Exporte le document envoyé dans `exports/<id>-<horodatage>/` |

**Stockage.**
- Documents : `data/documents/<id>.json`. Médias : `data/media/<assetId>.<ext>`. Les deux dossiers sont ignorés par git.
- Écriture atomique (fichier temporaire, puis `rename`).
- Chaque document est revalidé entièrement par le serveur (`loadDocument`).

**Sécurité.**
- Écoute sur `127.0.0.1` uniquement.
- Les requêtes d'écriture exigent `X-NS-Request: 1`. Cet en-tête force un contrôle CORS préalable qu'un site tiers ne peut pas passer, et l'`Origin`, s'il est présent, doit correspondre à l'hôte.
- Identifiants et noms de fichiers sont filtrés par expression régulière, et tout chemin résolu doit rester sous sa racine.
- SVG et types usurpés sont refusés.

**Fidélité.**
- Les médias ont la même URL `/media/<fichier>` dans le canvas et dans le site exporté. Le DOM reste identique : le banc donne 16/16, images comprises.

## Choix et limites

1. **Concurrence par ETag** (empreinte SHA-256 du fichier).
   - Un enregistrement fondé sur une version périmée est refusé ; l'interface propose alors explicitement « Écraser la version du serveur ».
   - Un modèle ou un import s'ouvre comme nouveau document : création seulement, avec un nouvel identifiant si l'import entre en collision.
2. **Médias partagés** dans `data/media/`, avec des noms aléatoires uniques. L'isolation par projet viendra avec les projets du jalon 2 (SB-01).
3. **Dimensions des images** mesurées par le navigateur (`createImageBitmap`) et vérifiées pour leur forme (entiers de 1 à 20 000). Elles ne servent qu'aux attributs `width`/`height` (commentaire `ponytail`).
4. **Médias orphelins.** L'annulation d'un ajout d'image retire la référence, pas le fichier. Il n'y a pas encore de nettoyage des médias orphelins.
5. **Pas de brouillon local.** En cas d'échec, le document reste en mémoire et marqué modifié, l'erreur reste affichée avec « Réessayer », et la fermeture de l'onglet est protégée par `beforeunload`. Un brouillon IndexedDB reste une option ouverte.
6. **Pas d'optimisation des images à l'export** (formats, tailles) : c'est SB-06 au jalon 2. Le fichier original est copié.
7. **Export côté serveur de dev.** L'export écrit un dossier sur le poste ; pas encore de téléchargement en archive.
8. **Notifications.** Le message d'export était d'abord masqué par le statut « Modifié ». Les notifications sont désormais distinctes du statut d'enregistrement ; le défaut a été trouvé par l'e2e.

## Vérifications

- `npm run check` : 66 tests unitaires (dont l'API : concurrence, validation, traversée, CSRF/origine, signatures, export), typecheck et lint au vert.
- `npm run test:e2e` : **19/19** sur le build de production avec l'API réelle et un dossier de données temporaire. S'y ajoutent :
  - enregistrement puis rechargement ;
  - échec réseau visible sans perte, puis nouvel essai ;
  - conflit et écrasement explicite ;
  - image avec `alt` obligatoire, envoi, export contenant le média et une annulation ;
  - import JSON invalide refusé avec diagnostics.
- `npm run test:fidelity` : **16/16** identiques (images comprises), 0 `<script>` exporté.

## Reste pour clore le jalon 1

- T14 : copier-coller et couper-coller entre conteneurs.
- T11 : arborescence au clavier, avec le motif ARIA `tree`.
- VE-01 : redimensionnement des panneaux.
- T18 : document de démonstration du jalon (hero, texte, bouton, image, grille de 3 cartes, mobile), scénario de bout en bout, build hors dépôt et liste des limites.
- Contrôles d'accessibilité automatisés de la page exportée (Definition of Done du jalon).
