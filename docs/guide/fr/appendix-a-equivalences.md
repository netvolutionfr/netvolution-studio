---
title: "Annexe A. Correspondances Tatsu / Elementor → Studio"
---

Cette table aide à retrouver un réflexe. Les colonnes Tatsu et Elementor donnent le nom habituel ; la dernière colonne indique où le trouver dans le Studio.

## Vocabulaire et gestes

| Tatsu | Elementor | Netvolution Studio |
|---|---|---|
| Section | Section / Conteneur | **Section** (composition) ou **Conteneur** |
| Row, Column | Inner Section, Colonne | [**Pile (Flex)** ou **Grille**](03-building-a-page.md) ; compositions **Rangée 2 colonnes**, **Rangée 3 colonnes** |
| Module | Widget | **Composant** |
| Arbre des modules | Navigator | **Arborescence** |
| Panneau d’options | Panneau d’édition (Contenu / Style / Avancé) | [**Inspecteur**](04-styling-and-responsive.md) : Contenu, Style, Mise en page, Espacements, Position et effets, Avancé |
| Modes responsive | Mode responsive | **Desktop / Tablette / Mobile** dans la barre d’outils ; les réglages ne s’appliquent qu’au breakpoint affiché |
| Masquer sur mobile | Responsive > Hide on Mobile | Avancé > **Masquer sur ce breakpoint** |
| Global Colors / Typography | Site Settings, couleurs et polices globales | [**Design system**](05-design-system.md) |
| Google Fonts, polices personnalisées | Google Fonts, Custom Fonts | **Catalogue de polices** du design system, ou import d’un fichier WOFF2 dans la médiathèque (polices servies par le site, sans appel à Google) |
| Global Sections | Global Widget | [**Composant réutilisable**](08-reuse.md) (lié : une modification se propage) |
| Templates sauvegardés | My Templates | Onglet **Sections** de la bibliothèque |
| Header / Footer Builder | Theme Builder (header, footer) | **Header et footer**, dans le panneau Pages |
| Kits de démarrage | Website Kits | **Modèles de site** (écran Projets) |
| Revisions | Historique, Révisions | **Annuler / Rétablir** et **Journal des opérations** (session en cours) |
| Aperçu | Preview | **Aperçu** (l’œil) ou **Aperçu du site** (nouvel onglet) |
| Publier / Mettre à jour | Publish / Update | **Enregistrer**, puis **Exporter le site** quand il est prêt à publier |
| Médiathèque WordPress | Médiathèque WordPress | **Médiathèque** du projet |
| Pages WordPress | Pages WordPress | Panneau **Pages** ; l’adresse s’appelle le **slug** |
| Menus WordPress | Menus WordPress | Panneau **Menus**, affichés par le composant **Navigation** |
| Yoast, Rank Math | Yoast, Rank Math | Inspecteur, quand rien n’est sélectionné : **Référencement et partage** |
| Typography : Letter Spacing, Text Transform | Typography : Letter Spacing, Transform | Inspecteur, section **Style** : **Espacement des lettres**, **Casse**, **Style** (italique) |
| Colonne « sticky » | Sticky, Motion Effects > Sticky | Inspecteur, **Position et effets** : position **Collante** |
| Bordure, Box Shadow | Border, Box Shadow | Inspecteur, section **Style** : **Bordure**, **Ombre** |
| Image de fond, Overlay, dégradé | Background (Classic, Gradient), Background Overlay | Inspecteur, section **Style** : **Image de fond**, **Dégradé** (préréglage « Voile sombre » pour l’overlay) |
| Motion effects, animations d’entrée | Motion Effects, Entrance Animation | Inspecteur, section [**Animations**](09-animations.md) |
| Édition du texte dans la page | Édition en ligne | Double-clic sur le texte dans le canvas (titres, textes, boutons, listes, accordéons, onglets) |

## Modules et widgets

| Tatsu / Elementor | Netvolution Studio |
|---|---|
| Titre (Heading) | **Titre**, niveau H1 à H6 |
| Texte (Text Editor) | **Texte** : gras, italique et liens ; un paragraphe par composant |
| Liste à puces ou numérotée (dans l’éditeur de texte) | **Liste** : puces, numéros, lettres ou chiffres romains |
| Bouton | **Bouton** : principal, secondaire ou lien texte |
| Image | **Image**, optimisée automatiquement à l’export |
| Galerie, galerie en mosaïque (masonry), lightbox | **Galerie** : mosaïque ou vignettes, agrandissement au clic |
| Carrousel d’images, slider | **Carrousel** : images par vue selon l’écran, boutons précédent/suivant, défilement automatique facultatif |
| Marquee, bandeau défilant (textes ou logos) | **Bandeau défilant** |
| Vidéo | **Vidéo** YouTube ou Vimeo |
| Icône | **Icône** (une vingtaine de pictogrammes) |
| Séparateur, Espaceur | **Séparateur**, **Espaceur** |
| Accordéon, Toggle, FAQ | **Accordéon** ; composition **Accordéon (FAQ)** |
| Onglets | **Onglets** ; composition **Bloc d’onglets** |
| Menu de navigation | **Navigation** (un niveau de sous-menu, repliée sur mobile) |
| Icon List, liens | **Liste de liens** |
| Call to Action | Composition **Appel à l’action** |
| Pricing Table | Composition **Tarifs** |
| Testimonial | Composition **Témoignages** (statique) |
| Team Member | Composition **Équipe** |
| Icon Box, Feature Box | Composition **Carte** ou **Atouts** |

## Sans équivalent

Ces éléments n’existent pas dans le Studio, souvent par choix :

| Tatsu / Elementor | Pourquoi, et que faire |
|---|---|
| HTML, shortcode, code personnalisé | Exclus par conception : ils échappent aux contrôles de qualité, d’accessibilité et de sécurité, et à la fidélité entre le Studio et le site. Un besoin récurrent est à remonter à l’équipe : il deviendra un composant. |
| CSS personnalisé, classe CSS d’un élément | **CSS du projet** (design system) et **Classes CSS** (inspecteur, Avancé) : feuille contrôlée, sans @import ni ressource externe |
| Formulaire de contact | Pas encore disponible (un site statique n’a pas de serveur pour recevoir le message). En attendant : un bouton vers une adresse `mailto:` ou vers un formulaire hébergé. |
| Google Maps, widgets externes | Pas d’intégration de contenus tiers : un bouton ou un lien vers la carte. |
| Compteurs, barres de progression, effets de parallaxe | Pas disponibles. Les animations du Studio couvrent l’entrée au défilement et le survol. |
| Plugins | Pas de plugins : le site exporté n’a besoin de rien d’autre que d’un hébergement de fichiers. |
| Rôles et comptes utilisateurs | Pas encore : toute l’équipe connectée a les mêmes droits. |
