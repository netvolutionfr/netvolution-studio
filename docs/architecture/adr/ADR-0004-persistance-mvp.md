# ADR-0004 — Persistance MVP

**Statut :** Accepté le 29/10/2026, stockage et médias remplacés par [ADR-0008](ADR-0008-persistance-par-projet.md) · **Date :** 29/10/2026 · **Réf. :** VE-10, 00 §3.3 ; étude §8

## Contexte

Le jalon 1 exige import/export JSON validés et une sauvegarde en environnement de développement contrôlé, sans choix de base de données. Aucune perte silencieuse.

## Décision recommandée

1. **Port** `DocumentRepository { list(); load(id); save(doc, expectedRevision) → { revision } | conflict }` dans `core/persistence`.
2. **Adaptateur dev** : middleware Vite (`configureServer` + `configurePreviewServer`) écrivant `data/documents/<id>.json` par écriture atomique (fichier temporaire + `rename`) ; ids validés par regex ; chemin résolu vérifié sous la racine ; écoute `127.0.0.1` uniquement ; contrôle de révision pour éviter l'écrasement entre onglets.
3. **Fichiers** : export JSON (téléchargement) et import (`<input type=file>`) passant par `loadDocument` (diagnostics affichés).
4. **Échecs** : bannière persistante, document resté « modifié », réessai, garde `beforeunload`.
5. `data/` exclu de git ; les `fixtures/` sont versionnées.

## Alternatives

- **localStorage / IndexedDB seul** : pas de fichier inspectable, quotas, perte au nettoyage navigateur ; peut servir de brouillon de secours [O].
- **File System Access API** : non disponible dans tous les navigateurs ciblés (Firefox, Safari). Rejeté comme adaptateur principal.
- **Base de données (SQLite…)** : hors périmètre du jalon 1.
- **Serveur Node séparé** : un processus de plus sans bénéfice tant que le middleware suffit.

## Conséquences

- Le Studio s'utilise via `npm run dev` / `npm run preview` en local au jalon 1 ; pas de déploiement Internet.
- L'adaptateur définitif (SQLite, CMS, stockage objet) se branchera sur le même port.

## Addendum (tranche 4, 29/10/2026)

- Concurrence : ETag (SHA-256 du fichier) avec `If-Match` / `If-None-Match: *` à la place d'un numéro de révision ; 412 → écrasement uniquement sur demande explicite.
- Anti-CSRF : en-tête `X-NS-Request` obligatoire sur les écritures + contrôle de l'`Origin`.
- Médias : dossier partagé `data/media/` (noms aléatoires) au jalon 1 ; isolation par projet au jalon 2.
- Détail : `docs/architecture/tranche-4.md`.

## Points ouverts

- [O] Brouillon local IndexedDB en complément.
- [O] Stockage des assets : sous `data/documents/<id>/assets/` (recommandé) ou bibliothèque commune (jalon 2).
