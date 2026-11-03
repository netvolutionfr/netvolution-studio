# ADR-0021 — Composant Galerie : mosaïque, vignettes, agrandissement au clic

**Statut :** Accepté le 01/11/2026 · **Date :** 01/11/2026 · **Réf. :** CLAUDE §6, §8 et §9, ADR-0002 (îlots), ADR-0010, `docs/research/essai-import-tatsu.md`

## Contexte

Les portfolios reposent sur des galeries en mosaïque, avec agrandissement au clic. Le site essayé en compte 11 ; Oshine les fait avec Isotope et PhotoSwipe. Le Studio n'avait qu'une grille d'images à colonnes égales, faite de composants Image séparés, sans agrandissement.

## Décision

1. **Un composant Galerie** (`gallery`), dont les props sont :
   - `images` : jusqu'à 200 éléments `{ assetId, alt, caption? }` ;
   - `layout` : `masonry` (hauteurs naturelles) ou `tiles` (images recadrées à une même proportion `ratio`) ;
   - `lightbox` : l'agrandissement au clic.
2. **La mosaïque se fait en CSS multicolonne**, sans JavaScript ni calcul de positions.
   - Les réglages « Colonnes » et « Espacement » (groupe `grid`, responsives) s'adaptent au type de composant : pour un composant en `display: block`, `columns` s'émet en `column-count` et `gap` en `column-gap` ; l'espacement vertical est exposé aux éléments par `--ns-gap`. La grille et la pile ne changent pas.
   - Contrepartie assumée : l'ordre visuel suit les colonnes, de haut en bas. L'ordre du HTML, que suivent le clavier et les lecteurs d'écran, reste celui de la liste.
3. **L'agrandissement** passe par un îlot (`gallery/island.ts`), chargé seulement par les pages qui ont une galerie.
   - Chaque image est un lien vers sa grande version ; l'îlot l'ouvre dans un `<dialog>` modal natif, avec précédent et suivant, flèches du clavier, Échap et clic hors de l'image pour fermer. Le focus revient au lien.
   - Les textes passent uniquement par `textContent` : rien n'est injecté en HTML.
   - Sans JavaScript, le lien ouvre l'image elle-même.
   - Le canvas ne charge pas l'îlot (un clic y sélectionne) ; l'aperçu du site, si.
4. **Un nouveau type de champ, `assets` (liste de médias)**, avec une fonction partagée `fieldAssets()`. Elle sert à la validation (média existant et de type accepté), au comptage des usages (retrait refusé tant qu'une image est utilisée) et à la copie à l'export.
5. **L'export optimise chaque image matricielle de la liste comme le composant Image** (ADR-0010) : variantes WebP et `srcset`, fusionnées image par image. L'agrandissement pointe vers la plus grande variante.
6. **La composition « Galerie »** de la bibliothèque devient « Grille d'images », pour éviter la confusion.

## Alternatives écartées

- **Une mosaïque en JavaScript** (calcul des positions, ordre de lecture en lignes) : du JavaScript et un risque de décalage au chargement, pour un gain d'ordre visuel seulement.
- **`grid-template-rows: masonry`** : pas encore pris en charge par les navigateurs.
- **Une bibliothèque d'agrandissement** (PhotoSwipe, GLightbox) : une dépendance de plus, alors que `<dialog>` couvre l'essentiel en quelques dizaines de lignes.

## Conséquences

- Banc de fidélité : la fixture `composition` contient une galerie en mosaïque. Le banc vérifie aussi l'agrandissement sur l'export : ouverture, image chargée, flèches, légende, Échap, focus rendu, lien de repli sans JavaScript.
- Le convertisseur Tatsu produit des galeries en mosaïque à partir des galeries d'Oshine.
- Le guide documente la Galerie (chapitres 3 et 7, annexe A).
