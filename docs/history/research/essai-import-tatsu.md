# Essai d'import d'un site Tatsu (01/11/2026)

**But :** vérifier si le Studio peut rivaliser avec Tatsu sur un site réel. On a pris un site de graphiste construit avec Oshin et Tatsu (11 pages), et converti deux pages représentatives : l'accueil et une page de portfolio. Le convertisseur, propre à ce site, et le contenu du client ne sont pas versionnés.

## Le site d'origine

- WordPress 7.1, thème enfant d'Oshin, Tatsu 3.5.3, Contact Form 7, portfolio « be-portfolio », Yoast, Imagify, Redirection.
- Modules sur l'ensemble du site : 300 sections, rangées et colonnes ; 183 textes enrichis ; 52 bandeaux défilants (marquee) ; 11 galeries ; 4 carrousels ; 10 boutons ; 9 menus ; 5 accordéons ; 1 titre animé ; 1 formulaire.
- Effets activés : parallaxe sur environ 100 colonnes, inclinaison 3D au survol (12), zoom lent sur image (2), environ 85 entrées animées, 2 colonnes collantes, voiles de couleur, 1 section plein écran.
- Code personnalisé : un effet de curseur en JavaScript, des classes CSS du thème (`fold3d`, `rightbutt`, `upbutt`) et un CSS global.
- Polices commerciales (Helvetica Neue LT Std Extended, Nimbus Sans Extended) chargées depuis fonts.com.

## Résultat de la conversion (2 pages)

- 224 éléments et 84 médias. L'import est accepté sans aucun média refusé. L'export et le build passent ; il n'y a pas de défilement horizontal à 1440 ni à 390 px.
- **Structure, textes, images, menus, design system (couleurs, styles de titres), animations d'entrée et responsive** sont repris. La page portfolio est très proche de l'original.
- **Éléments perdus ou approchés**, tels que les compte le convertisseur :

| Élément | Occurrences |
|---|---|
| Parallaxe de colonne | 25 |
| Mise en forme mixte dans un titre (gras ou italique sur une partie) | 18 |
| Texte en dégradé (couleur dégradée de Tatsu) | 12 |
| Mise en forme locale sur une partie de texte (fond, taille, espacement) | 8 |
| Colonne entièrement cliquable | 5 |
| Classes CSS du thème (`rightbutt`, `upbutt`, `fold3d`), reportées sur les éléments ; règles à réécrire dans le CSS du projet (ADR-0023) | 6 |
| Inclinaison 3D au survol | 3 |
| Zoom lent au survol d'image | 1 |
| Animation de fond de section | 1 |

- **Le hero de l'accueil est perdu.** Son fond gris et son carré noir incliné ne viennent pas de Tatsu mais d'une classe CSS du thème (`fold3d`). Aucun convertisseur ne peut le retrouver sans reproduire ce CSS.
- **Les polices commerciales** sont remplacées par des polices système. Pour les reprendre, il faut des fichiers WOFF2 et une licence Monotype qui autorise l'hébergement par le site lui-même.

## Ce qu'il manque au Studio, par priorité

1. **Fait le 01/11/2026 (ADR-0019)** : espacement des lettres, casse, italique, éléments collants, retours à la ligne.
2. **Fait le 01/11/2026 (ADR-0020)** : texte enrichi en paragraphes, couleur par passage, titres enrichis, texte en dégradé. Après ce changement, le convertisseur ne perd plus les 18 titres à mise en forme mixte ni les 12 textes en dégradé ; il reste 8 passages avec une taille ou un fond locaux.
3. **Fait le 01/11/2026 (ADR-0021)** : composant Galerie en mosaïque ou en vignettes, avec agrandissement au clic. Le convertisseur produit des galeries en mosaïque à partir de celles d'Oshine.
4. **Fait le 01/11/2026 (ADR-0022)** : bandeau défilant (textes ou images) et carrousel d'images. Le convertisseur produit des bandeaux en mode images et des carrousels à partir de ceux d'Oshine.
5. **Effets liés au défilement et à la souris** : parallaxe, inclinaison 3D, zoom lent, et une zone entièrement cliquable.
6. **Collections** (portfolio, actualités) : la limite avec le futur CMS éditorial.
7. Hors du Studio par principe : **le code personnalisé**. Un effet récurrent devra devenir un composant contrôlé.
