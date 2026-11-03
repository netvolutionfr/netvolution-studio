# ADR-0010 — Médiathèque, SVG et optimisation des images

**Statut :** Accepté le 30/10/2026 (choix de l'optimisation validé par l'utilisateur) · **Date :** 30/10/2026 · **Réf. :** SB-06, ADR-0002, ADR-0008 ; étude jalon 2 §4.5

## Contexte

SB-06 demande :
- l'import d'images, de SVG sûrs et de fichiers téléchargeables ;
- l'organisation et la recherche ;
- les métadonnées et le texte alternatif ;
- la détection des ressources manquantes ;
- une optimisation des images à l'export : formats adaptés, dimensions, variantes responsives, lazy-loading, originaux conservés.

ADR-0002 impose que le canvas et l'export partagent les mêmes vues, et le banc de fidélité compare leur DOM et leurs pixels. L'étude laissait ouvert l'outil d'optimisation : `sharp` à l'import dans le Studio, ou `astro:assets` au build de l'export.

## Décision

1. **Médias typés** : `Asset` devient une union de trois types.
   - `image` (PNG, JPEG, WebP, AVIF) et `svg` portent leurs dimensions et un texte alternatif par défaut.
   - `file` (PDF, ZIP, DOCX, XLSX, PPTX) porte sa taille.
   - Les métadonnées `name` et `tags` sont communes et optionnelles, donc les sites existants restent valides sans migration.
   - Les composants référencent un média par id. Un champ `asset` déclare les types qu'il accepte (`accept`), et `loadSite` refuse un média absent ou d'un type non accepté.
   - Un lien peut viser un média (`{ kind: 'asset', assetId }`), par exemple un fichier à télécharger.
2. **SVG : vérification par refus, sans réécriture.** Un SVG est refusé s'il contient un DOCTYPE ou une entité, un élément actif (`script`, `foreignObject`, `iframe`, `object`, `embed`…), un attribut `on*`, une URL `javascript:` ou `data:`, une référence `href` ou `url()` qui ne pointe pas vers le document (`#id`), ou un `@import`. La vérification porte sur le texte brut et sur sa version aux entités numériques décodées. Le SVG est rendu **uniquement via `<img>`**. Le Studio le sert avec `Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'` et `nosniff`.
3. **Fichiers** : liste blanche de types, signature vérifiée (`%PDF-`, `PK\x03\x04`), servis avec `Content-Disposition: attachment`.
4. **Optimisation au build par `astro:assets` (choix de l'utilisateur).**
   - Les images raster placées par un composant sont exportées dans `src/media/`, et l'original est conservé.
   - La page Astro générée appelle `getImage` (variantes WebP 480, 960 et 1600 px, limitées à la largeur d'origine, plus un `sizes`) et transmet `src`, `srcSet` et `sizes` à la vue, qui les ajoute à `<img>`.
   - Les SVG, les fichiers et les médias liés vont tels quels dans `public/media/`.
   - Une image en chargement immédiat reçoit `fetchpriority="high"` ; les autres restent en `loading="lazy"`.
5. **Fidélité.** Le canvas affiche l'original, l'export une variante.
   - Le banc compare désormais le `src` d'une image par identifiant de média et ignore `srcset` et `sizes`.
   - Il masque les pixels des images dans les captures, mais compare toujours leurs boîtes et leurs styles calculés : une image ne peut pas décaler la mise en page sans être détectée.

## Alternatives

- **`sharp` à l'import** : variantes identiques dans le canvas et l'export, donc fidélité pixel à pixel conservée. En contrepartie, c'est une dépendance native de plus dans le Studio.
- **Pas d'optimisation** : aucune dépendance, mais SB-06 n'est qu'en partie couvert.

## Conséquences

- Aucune dépendance nouvelle dans le Studio. L'export s'appuie sur le service d'images par défaut d'Astro (sharp, déjà présent dans son lockfile).
- Les pixels des images ne sont plus comparés par le banc ; c'est une perte de couverture assumée.
- La CLI d'export lit les médias dans le dossier `media/` placé à côté du document.
