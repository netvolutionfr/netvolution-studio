# Jalon 2 — Tranche 5 : médiathèque

**Date :** 30/10/2026 · **Périmètre :** SB-06 (étude jalon 2 §4.5, §9), ADR-0010 · **Statut :** livré

## Livré

| Élément | Emplacement | Vérification |
|---|---|---|
| Médias typés `image` / `svg` / `file`, métadonnées `name`, `alt` par défaut, `tags` ; champ `asset` avec `accept` ; liens vers un média | `core/src/document/schema.ts`, `links.ts`, `load.ts` | `components.test.ts` |
| Commandes `updateAsset` (nom, texte alternatif, tags), `removeAsset` (refusée si le média est utilisé) ; `assetReferences` (usages) | `core/src/editor/commands.ts` | `components.test.ts` |
| Import : images, SVG vérifiés par refus, fichiers en liste blanche avec signature ; SVG servis sous CSP, fichiers en pièce jointe ; liste des fichiers présents | `dev-server/media.ts`, `api.ts` | `media.test.ts` (18 SVG piégés), `api.test.ts` |
| Panneau Médiathèque : import multiple, recherche (nom, fichier, tag), aperçu, métadonnées, usages, « inutilisé », « fichier manquant », retrait | `shell/MediaLibrary.tsx` | e2e |
| Champ image : envoi d'une image ou d'un SVG, réutilisation depuis la médiathèque avec son texte alternatif par défaut ; champ Lien : « Fichier à télécharger » ; texte enrichi : les liens vers un média sont conservés | `AssetField.tsx`, `PropFields.tsx`, `RichTextField.tsx` | e2e |
| Export : images raster optimisées au build par `astro:assets` (`src/lib/media.ts` : WebP 480, 960, 1600 px, `srcset`, `sizes`), originaux dans `src/media/` ; SVG et fichiers dans `public/media/` ; `fetchpriority="high"` pour l'image principale | `export-astro/src/generate.ts`, `write.ts`, `image/view.tsx` | `export.test.ts`, démo (build réel : variantes WebP et `srcset`) |
| Banc de fidélité : `src` des images comparé par identifiant de média, pixels des images masqués, boîtes et styles toujours comparés | `tests/fidelity/compare.ts` | banc 28/28 |
| CLI d'export : médias lus dans `media/` à côté du document (corrige l'export en ligne de commande d'un document avec image) | `export-astro/src/cli.ts` | build manuel de `fixtures/elements.json` |

## Choix faits pendant la tranche

- **Retirer n'efface pas le fichier** : un média retiré de la médiathèque reste dans le dossier du projet, ce qui permet l'annulation.
- **Dimensions mesurées dans le navigateur** : pour un SVG, elles sont lues dans `width`/`height` ou le `viewBox`.
- **Tags conservés tels que saisis** : le champ fait l'aller-retour exact, et un tag vide est refusé.
- **Un texte alternatif par usage** : le texte alternatif par défaut d'une image est proposé au placement, puis chaque usage garde le sien.

## Vérifications

| Commande | Résultat |
|---|---|
| `npm run typecheck`, `npm run lint` | sans erreur |
| `npm test` | 120/120 |
| `npm run test:e2e` | 31/31, dont « médiathèque : SVG sûr et PDF importés, SVG piégé refusé, recherche, lien de téléchargement » |
| `npm run test:fidelity` | 28/28 identiques (images masquées), 0 `<script>`, aucune violation grave |
| `npm run demo` | réussie : build hors dépôt avec 2 variantes WebP et `srcset` |

## Limites

- **Pas d'organisation en dossiers** : seuls les tags et la recherche organisent la médiathèque. Pas de remplacement d'un fichier en gardant son id, pas de nettoyage des fichiers orphelins.
- **Fichiers de police (`@font-face`)** : toujours pas importables (reporté depuis la tranche 3, à traiter avec les composants enrichis ou en fin de jalon).
- **Fidélité des images** : les pixels ne sont plus comparés par le banc (ADR-0010 §5).
- **Mesure de `sizes`** : le `sizes` généré suppose une image jamais plus large que son original, sans tenir compte de la largeur de sa colonne.
- **Variantes** : produites en WebP seulement, pas d'AVIF.
