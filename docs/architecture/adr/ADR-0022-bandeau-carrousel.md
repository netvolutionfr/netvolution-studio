# ADR-0022 — Bandeau défilant et carrousel

**Statut :** Accepté le 01/11/2026 · **Date :** 01/11/2026 · **Réf. :** CLAUDE §6, §8 et §9, ADR-0002 (îlots), ADR-0010, ADR-0021, `docs/research/essai-import-tatsu.md`

## Contexte

Le site Tatsu essayé compte 52 bandeaux défilants (logos, mots-clés) et 4 carrousels d'images. Le convertisseur les rendait en ligne d'images fixe ou en galerie. Ces deux motifs posent des questions d'accessibilité : un mouvement de plus de cinq secondes doit pouvoir être mis en pause (WCAG 2.2.2), et un carrousel doit rester utilisable au clavier et sans JavaScript.

## Décision

1. **Un composant Bandeau défilant** (`marquee`) : textes enrichis (avec séparateur) ou images de la médiathèque, hauteur des images, espacement, durée d'un tour, sens.
   - Le défilement est **une animation CSS** (`translateX(-50%)` sur une piste contenant deux fois le contenu). La copie est masquée aux technologies d'assistance (`aria-hidden`, textes alternatifs vides).
   - Il s'arrête au survol et au focus. Un îlot affiche un bouton **Mettre en pause** / **Reprendre le défilement** (`aria-pressed`).
   - Avec `prefers-reduced-motion`, rien ne bouge : le contenu passe à la ligne, la copie et le bouton sont masqués.
2. **Un composant Carrousel** (`carousel`), d'images seulement : nom accessible, proportion, nombre d'images visibles par point de rupture (`--ns-per-view`), espacement, défilement automatique facultatif et intervalle.
   - La piste est une **grille horizontale avec `scroll-snap`** : sans JavaScript, elle défile au doigt, à la barre de défilement et aux flèches du clavier (elle est focalisable).
   - Un îlot affiche les boutons précédent et suivant (bouclage aux extrémités) et, si activé, le défilement automatique. Celui-ci s'arrête au survol, au focus et avec le bouton **Pause**, et ne démarre jamais avec `prefers-reduced-motion`.
   - Sémantique du motif « carrousel » de l'APG : `section` avec `aria-roledescription`, diapositives `role="group"` nommées « n sur N ».
3. **Le canvas exécute les deux îlots** (`canvasIslands`), pour que son DOM corresponde à l'export ; le carrousel y tourne sans défilement automatique.
4. Les deux composants réutilisent le champ « liste de médias » (ADR-0021) : validation, usages et variantes WebP à l'export.

## Alternatives écartées

- **Une bibliothèque de carrousel** (Swiper, Splide, Embla) : une dépendance et du JavaScript pour ce que `scroll-snap` fait nativement.
- **Un bandeau entièrement en JavaScript** (`requestAnimationFrame`) : plus de code, sans gain visible.
- **Des diapositives composées** (titre, texte, bouton) : elles demandent des enfants libres et un autre modèle d'édition. Reporté à un besoin réel.

## Conséquences

- Banc de fidélité : la fixture `composition` contient un bandeau et un carrousel. Sur l'export, le banc vérifie le défilement, la pause, le mouvement réduit et les boutons du carrousel.
- Le convertisseur Tatsu produit des bandeaux en mode images et des carrousels.
- Le guide documente les deux composants (chapitres 3 et 7, annexes A et B).
