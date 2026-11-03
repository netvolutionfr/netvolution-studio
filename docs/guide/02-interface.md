---
title: "2. L’interface"
---

L’éditeur se découpe en cinq zones. Les panneaux de gauche et de droite se redimensionnent en faisant glisser leur bordure ; le Studio retient leur largeur.

![Un titre sélectionné : son cadre dans le canvas, sa ligne dans l’arborescence, ses réglages dans l’inspecteur](images/selection.png)

## L’écran Projets

C’est la page d’accueil du Studio. On y crée un projet depuis un **modèle**, on ouvre, **duplique** ou **supprime** un projet existant (il part dans une corbeille, côté serveur), et on **importe** une archive exportée d’un autre Studio. Les modèles de site que vous avez enregistrés apparaissent sous « Mes modèles de site ».

Depuis l’éditeur, le lien **← Projets** en haut à gauche y ramène. Le bouton de **langue** (en haut à droite) choisit la langue de l’interface ; la page se recharge dans la langue choisie. À la première visite, le Studio s’ouvre dans la langue du navigateur s’il la connaît (français ou anglais), sinon en anglais ; le choix fait ensuite est retenu par le navigateur.

## La barre d’outils

**À gauche**, le projet :

- le **nom du projet** et son **état** : « Enregistré » ou « Modifié (non enregistré) » ;
- **Enregistrer** (<kbd>⌘</kbd> <kbd>S</kbd>) ;
- le menu **⋯** (Plus d’actions) : exporter le site, exporter l’archive du projet (site et médias, pour le sauvegarder ou le transférer), enregistrer le projet comme modèle de site.

**Au centre**, l’affichage :

- **Annuler** et **Rétablir** ;
- la **taille d’écran** : Desktop (1280 px), Tablette (820 px), Mobile (390 px), ou une largeur précise dans le champ « px » ;
- le **breakpoint édité**, par exemple « Base (desktop) » ou « Mobile » : les styles modifiés s’appliquent à ce breakpoint (voir plus bas).

**À droite**, les panneaux du site, qui prennent la place de l’inspecteur (un second clic le rend) :

| Icône | Panneau | Rôle |
|---|---|---|
| Palette | **Design system** | Couleurs, tailles, polices, styles de texte et CSS du projet |
| Images | **Médiathèque** | Images, SVG et fichiers du projet |
| Liste | **Menus** | Menus de navigation |
| Étincelles | **Assistant IA** | Propositions de modifications, à valider |
| Horloge | **Journal des opérations** | Ce qui a été fait pendant la session, par vous ou par l’IA |

Puis :

- **Aperçu du site** ouvre le site dans un nouvel onglet, pour naviguer de page en page sans les outils d’édition ;
- **Aperçu** (l’œil) masque les panneaux et les cadres de sélection, pour juger la page seule ;
- **?** ouvre ce guide ;
- le soleil ou la lune bascule l’interface en **thème clair ou sombre** (le site produit n’est pas concerné) ;
- le bouton de **langue** choisit la langue de l’interface (français ou anglais). Enregistrez avant : la page se recharge. La langue du site produit se règle à part, dans les réglages du site (inspecteur, section Site).

## À gauche : pages, bibliothèque, arborescence

**Pages.** La liste des pages, avec leur adresse ; la maison signale la page d’accueil, un œil barré une page non publiée. Cliquez sur une page pour l’ouvrir, sur l’icône en haut à droite pour en ajouter une. Dessous, **Header et footer** ouvre les parties communes à toutes les pages, et **Composants partagés** les composants réutilisables du projet, quand il y en a.

**Ajouter.** La bibliothèque, en deux onglets :

- **Composants** : les éléments de base, rangés en **Structure** (conteneur, pile, grille, espaceur, accordéon, onglets), **Contenu** (titre, texte, liste, bouton, icône, séparateur, navigation, liste de liens), **Médias** (image, vidéo), puis des **Compositions** toutes prêtes (section, rangées de colonnes, hero, carte, galerie, tarifs, témoignages…) ;
- **Sections** : les sections de la bibliothèque et celles que vous avez enregistrées.

Un clic insère l’élément dans la boîte sélectionnée, ou après l’élément sélectionné, ou à la fin de la page si rien n’est sélectionné (détails au chapitre [Construire une page](03-construire-une-page.md)). On peut aussi le glisser dans le canvas.

**Arborescence.** La structure de la page, emboîtement compris. Elle sert à sélectionner un élément difficile à atteindre dans le canvas (un conteneur sans fond, un élément caché sur mobile), à déplier ou replier une partie de la page, et à déplacer des éléments par glisser-déposer. Le **nom** d’un élément se change dans l’inspecteur, section **Avancé** : nommez vos sections (« Hero », « Tarifs »), la page devient plus lisible.

## Au centre : le canvas

Le canvas affiche la page avec les mêmes composants et les mêmes styles que le site exporté : ce que vous voyez est ce qui sera publié. Quand la largeur choisie dépasse la place disponible, la page est réduite (« Zoom 64 % » en haut à droite).

- **Survoler** un élément l’entoure d’un trait fin ; **cliquer** le sélectionne. Son type s’affiche en étiquette au-dessus.
- Un élément sélectionné porte des **poignées** pour régler sa largeur et sa hauteur à la souris, et une petite barre pour l’**aligner dans son parent**.
- Les liens et boutons ne réagissent pas au clic dans le canvas : utilisez **Aperçu du site** pour naviguer.

## À droite : l’inspecteur

**Quand rien n’est sélectionné** (<kbd>Échap</kbd>), il règle la page et le site : titre et adresse de la page, affichage du header et du footer, publication, **Référencement et partage**, puis nom, langue et URL du site.

**Quand un élément est sélectionné**, il affiche, de haut en bas :

1. le type de l’élément et ses **actions** : monter, descendre, dupliquer, copier, couper, coller, créer un composant réutilisable, supprimer ;
2. **Contenu** : ce que contient l’élément (texte, lien, image, niveau de titre…) ;
3. l’indication **Styles appliqués à** : le breakpoint que vous modifiez ;
4. les styles, regroupés en **Style**, **Mise en page**, **Espacements**, **Position et effets** et **Avancé** ; seuls les réglages utiles au type d’élément apparaissent ;
5. **Animations**.

### Breakpoints : desktop d’abord, puis les exceptions

Les styles réglés en **Desktop** forment la **base** : ils s’appliquent à toutes les tailles d’écran. En Tablette ou en Mobile, vous ne réglez que les **différences** (une taille de titre plus petite, une rangée qui passe en colonne). Les modèles fournis définissent deux breakpoints :

- **Tablette**, jusqu’à 1023 px de large ;
- **Mobile**, jusqu’à 767 px.

Devant chaque réglage, un **point** indique d’où vient la valeur : **plein**, elle est définie sur ce breakpoint ; **creux**, elle est héritée d’une taille plus grande. La flèche circulaire à droite d’une valeur définie la **réinitialise**, c’est-à-dire revient à la valeur héritée. Le chapitre [Mise en forme et responsive](04-mise-en-forme-et-responsive.md) détaille la méthode.

## Raccourcis clavier

Sous Windows et Linux, remplacez <kbd>⌘</kbd> par <kbd>Ctrl</kbd>.

| Action | Raccourci |
|---|---|
| Enregistrer | <kbd>⌘</kbd> <kbd>S</kbd> |
| Annuler | <kbd>⌘</kbd> <kbd>Z</kbd> |
| Rétablir | <kbd>⇧</kbd> <kbd>⌘</kbd> <kbd>Z</kbd> ou <kbd>⌘</kbd> <kbd>Y</kbd> |
| Copier, couper, coller l’élément | <kbd>⌘</kbd> <kbd>C</kbd>, <kbd>⌘</kbd> <kbd>X</kbd>, <kbd>⌘</kbd> <kbd>V</kbd> |
| Dupliquer l’élément | <kbd>⌘</kbd> <kbd>D</kbd> |
| Supprimer l’élément | <kbd>Suppr</kbd> ou <kbd>⌫</kbd> |
| Désélectionner | <kbd>Échap</kbd> |

Dans l’arborescence, les flèches <kbd>↑</kbd> <kbd>↓</kbd> passent d’un élément à l’autre, <kbd>→</kbd> et <kbd>←</kbd> déplient et replient, <kbd>Début</kbd> et <kbd>Fin</kbd> vont au premier et au dernier élément.

Les raccourcis d’édition sont inactifs pendant la saisie dans un champ : <kbd>⌘</kbd> <kbd>Z</kbd> y annule la frappe, pas la dernière action du Studio.

> **Copier-coller.** Le presse-papiers du Studio est interne à l’onglet : on copie un élément d’une page pour le coller sur une autre page du même projet, mais pas dans un autre logiciel ni dans un autre projet. Les sections enregistrées sont, elles aussi, propres à un projet ; pour repartir d’un projet entier, enregistrez-le comme modèle de site (chapitre [Réutiliser](08-reutiliser.md)).
