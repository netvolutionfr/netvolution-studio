# ADR-0008 — Persistance par projet

**Statut :** Accepté le 30/10/2026 · **Date :** 30/10/2026 · **Réf. :** SB-01, SB-06, SB-12, ADR-0004 ; étude jalon 2 §4.4

## Contexte

ADR-0004 stocke des documents isolés dans `data/documents/` et des médias communs dans `data/media/`. SB-01 exige des projets isolés, ressources comprises, et une architecture qui laisse entrer plus tard comptes et organisations.

## Décision recommandée

1. **Un dossier par projet** : `data/projects/<projectId>/site.json` + `media/` (originaux) + `media/.derived/` (variantes reconstructibles).
2. Id de projet généré par le serveur (`p` + 10 caractères `[a-z0-9]`), validé par regex à chaque requête ; chemins résolus et vérifiés sous la racine.
3. Routes `/api/projects` (liste, création, lecture, écriture `If-Match`, duplication, suppression, import/export d'archive) et `/media/<projectId>/<file>`.
4. **Suppression = déplacement vers `data/trash/`**, après confirmation dans l'UI. Pas d'effacement définitif depuis le Studio.
5. Duplication : copie du dossier, nouvel id et nouveau nom ; les ids internes (nœuds, pages, médias) sont conservés, puisqu'ils sont locaux au projet.
6. Gardes conservées : `X-NS-Request`, contrôle d'origine, écoute `127.0.0.1`, écriture atomique, taille maximale.
7. Comptes et organisations futurs : un préfixe de chemin dans l'adaptateur (`<orgId>/<projectId>`), sans changement du modèle.
8. Les documents du jalon 1 (`data/documents/`) s'importent manuellement (migration v1 → v2) ; pas de conversion automatique.

## Alternatives

- **Médiathèque commune entre projets** : réutilisation plus simple, mais contraire à l'isolation demandée et à l'export autonome.
- **Base SQLite** : utile avec plusieurs utilisateurs ; hors périmètre (comme dans ADR-0004).
- **Effacement immédiat** : plus simple, mais irréversible pour une action déclenchée d'un clic.

## Conséquences

- Remplace les points 2 et l'addendum « médias » d'ADR-0004 ; le reste (ETag, anti-CSRF, échecs visibles) est inchangé.
- La corbeille n'est pas vidée automatiquement ; c'est documenté dans les limites.

## Points ouverts

- [Réglé, tranche 7] Format d'archive : un fichier JSON `{ format: 'ns.archive', version, site, media }` (médias en base64), sans dépendance ZIP ; à l'import, chaque fichier repasse par les contrôles d'envoi (type, taille, signature, politique SVG).

## Addendum — mise en œuvre (tranche 2, 30/10/2026)

- L'id du site est l'id du projet ; il est imposé par le serveur à la création et à la duplication.
- La création (`POST /api/projects`) reçoit un site complet (modèle ou import, v1 accepté) et copie les médias
  référencés depuis les sources en lecture seule ; les médias introuvables sont comptés (`missingMedia`).
- `PUT` exige `If-Match` ; il n'y a plus de création par `PUT`. Les routes `/api/documents` et `/api/media` du jalon 1
  sont supprimées.
- Le Studio sert les médias en `/media/<projectId>/<fichier>` et passe ce préfixe au rendu (`RenderContext.mediaBase`) ;
  l'export garde `/media/<fichier>`.
