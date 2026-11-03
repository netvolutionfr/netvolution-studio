---
title: "Annexe C. Bonnes pratiques"
---

Le Studio garantit un code propre, des pages légères et une accessibilité de base. Le reste dépend de vos choix : cette annexe rassemble ceux qui comptent le plus.

## Accessibilité

Un site accessible est utilisable au clavier, avec un lecteur d’écran, en zoomant, par des personnes âgées ou en situation de handicap. C’est aussi une obligation légale pour de nombreux sites, et un atout pour le référencement.

- **Un titre H1 par page, puis H2, H3 dans l’ordre**, sans sauter de niveau. Le niveau dit la structure ; la taille se règle dans le style. Les contrôles avant export signalent les écarts.
- **Un texte alternatif utile** pour chaque image qui porte du sens ; **Image décorative** pour les autres (chapitre [Les médias](07-media.md)).
- **Du contraste** : 4,5:1 au moins entre un texte courant et son fond, 3:1 pour un grand titre. Attention aux textes clairs sur des photos : ajoutez un voile (dégradé).
- **Des liens explicites** : « Voir nos tarifs » plutôt que « Cliquez ici ». Plusieurs « En savoir plus » sur une page se distinguent mal pour un lecteur d’écran : préférez « Découvrir le conseil », « Découvrir la création »…
- **Pas d’information portée par la seule couleur** (« les champs en rouge ») ni par la seule position (« le bouton à droite »).
- **Le clavier** : parcourez la page avec <kbd>Tab</kbd> dans l’Aperçu du site ; chaque lien et bouton doit montrer où l’on est.
- **La langue** du site (inspecteur, section Site) : elle permet aux lecteurs d’écran de prononcer correctement.
- **Des animations sobres**, et un effet au focus clavier quand il y en a un au survol (chapitre [Animations](09-animations.md)).
- **Pas de contenu caché** sur mobile s’il est utile : tout le monde doit pouvoir y accéder.

Le Studio vérifie automatiquement une partie de ces règles (avec l’outil axe) ; une relecture humaine reste nécessaire.

## Référencement (SEO)

- **Un titre SEO et une meta description par page**, uniques, qui donnent envie de cliquer (chapitre [Le site](06-the-site.md)).
- **Des adresses courtes et parlantes** : `/tarifs/`, `/services/creation-site/`. Ne les changez plus une fois le site en ligne, ou ajoutez une redirection.
- **L’URL canonique du site** renseignée : elle active le sitemap.
- **Des titres qui reprennent les mots que cherchent les clients** (« Création de site vitrine à Lille »), sans bourrage de mots-clés.
- **Une image de partage** (1200 × 630 px) pour les pages qui seront partagées sur les réseaux.
- Lors d’une refonte, **les redirections** des anciennes adresses vers les nouvelles, pour ne pas perdre le référencement acquis.

## Performance

Les sites du Studio partent avec un avantage (HTML statique, pas de WordPress, très peu de JavaScript). Pour le garder :

- **Images** : importez une seule version assez grande (1600 px pour une pleine largeur), le Studio fait le reste. Mettez l’image principale du haut de page en chargement **Immédiat**, les autres en **Différé**.
- **Images de fond** : préparées à la main, sous 500 Ko, car elles ne sont pas optimisées.
- **Polices** : deux familles au plus, et seulement les styles utilisés. Une police variable du catalogue couvre toutes les graisses en un fichier.
- **Animations et composants interactifs** : chacun ajoute un peu de JavaScript à la page ; n’en mettez que là où ils servent.
- **Vidéos** : une vidéo YouTube ou Vimeo pèse lourd ; préférez une seule par page.

## Responsive

- Concevez d’abord en **Desktop**, puis corrigez en **Tablette** et **Mobile** : ne réglez sur un petit écran que ce qui change.
- Préférez les **espacements (gap)**, les **largeurs max.** et les grilles aux tailles fixes en pixels : ils s’adaptent seuls.
- Vérifiez chaque page à 390 px, puis à des largeurs intermédiaires (600, 900 px) avec le champ « px ».
- Des boutons et liens assez grands sur mobile : 44 px de haut environ, assez d’espace entre eux.

## Organisation

- **Nommez** vos sections dans l’arborescence (« Hero », « Tarifs », « Contact ») : vous et vos collègues vous y retrouverez.
- **Le design system d’abord**, les pages ensuite (chapitre [Le design system](05-design-system.md)).
- **Un composant réutilisable** pour tout bloc répété sur plusieurs pages.
- **Le CSS du projet en dernier recours** : un réglage de l’inspecteur reste plus simple à reprendre. Nommez les classes par leur rôle (`carte-relief`, pas `bleu-gauche`), visez vos propres classes plutôt que les classes `ns-…`, et ajoutez une règle `prefers-reduced-motion` à toute animation.
- **Enregistrez souvent**, et exportez l’**archive du projet** avant une refonte importante.
- **Un projet, une personne à la fois.**
