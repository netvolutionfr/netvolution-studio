---
title: "Annexe B. Limites actuelles et contournements"
---

Le Studio est jeune : certaines fonctions des page builders n’existent pas encore, d’autres sont volontairement absentes. Cette annexe liste ce que vous rencontrerez, avec le contournement quand il existe. Les absences **volontaires** (HTML libre, plugins…) sont expliquées dans l’[annexe A](appendix-a-equivalences.md).

## Édition

| Limite | Contournement |
|---|---|
| Les textes ne s’éditent pas directement dans la page | Cliquez le texte dans le canvas, modifiez-le dans l’inspecteur (section Contenu) |
| On ne peut pas attraper un élément dans le canvas pour le déplacer | Glissez sa ligne dans l’**arborescence**, ou coupez-collez (<kbd>⌘</kbd> <kbd>X</kbd>, sélection de la destination, <kbd>⌘</kbd> <kbd>V</kbd>) |
| Pas de défilement automatique pendant un glisser-déposer | Repliez des parties de l’arborescence, ou utilisez couper-coller |
| Pas de sélection multiple | Regroupez les éléments dans une boîte, puis agissez sur la boîte |
| Le copier-coller ne fonctionne qu’à l’intérieur du Studio, dans un même projet | Entre projets : un modèle de site, ou l’archive du projet |
| Les liens d’un texte enrichi se saisissent dans une petite fenêtre du navigateur | — |
| Pas d’intertitre ni de liste à l’intérieur d’un texte | Un composant **Titre** ou **Liste** entre deux **Texte** |
| Pas de taille, de fond ni de dégradé sur une partie d’un texte (seulement gras, italique, couleur, lien) | Découpez en plusieurs éléments, ou appliquez le réglage à tout l’élément |
| Une couleur choisie dans le texte ne suit pas les changements du design system | Pour tout un élément, utilisez la **Couleur du texte** de l’inspecteur |
| Le canvas ne montre pas les animations par défaut | Cochez **Jouer les animations dans le canvas**, ou utilisez l’**Aperçu du site** |
| Pas d’historique entre deux sessions : l’annulation et le journal repartent de zéro à la réouverture | Avant une grosse modification, exportez l’archive du projet (menu **⋯**) |
| Pas d’enregistrement automatique | <kbd>⌘</kbd> <kbd>S</kbd> régulièrement ; le Studio prévient si vous fermez l’onglet sans enregistrer |
| Langues de l’interface : français et anglais seulement | Une autre langue s’ajoute par un fichier de traduction (voir CONTRIBUTING du dépôt) |

## Composants et mise en forme

| Limite | Contournement |
|---|---|
| Pas de **formulaire** (un site statique n’a pas de serveur pour recevoir les messages) | Un bouton vers une adresse `mailto:`, ou vers un formulaire hébergé (Tally, Framaforms…) |
| Carrousel : images seulement, pas de diapositive composée (titre, texte, bouton) | Une grille de cartes, ou une galerie |
| Vidéo : YouTube ou Vimeo seulement | Hébergez la vidéo sur l’une de ces plateformes |
| Une vingtaine d’icônes | Une image SVG de la médiathèque |
| Navigation : un niveau de sous-menu | Regroupez les pages, ou créez une page de rubrique |
| Un accordéon fermé ne s’édite pas dans le canvas | Cochez **Ouvert au chargement** le temps de l’éditer, ou passez par l’arborescence |
| Une bordure s’applique aux quatre côtés à la fois | Pour un trait d’un seul côté : un composant **Séparateur** |
| Une ombre et une image de fond par élément | Emboîtez deux boîtes |
| Les tailles d’écran (breakpoints) ne se modifient pas | Desktop, Tablette (jusqu’à 1023 px), Mobile (jusqu’à 767 px) couvrent l’essentiel |
| Pas de contrôle du contraste des couleurs | Un outil en ligne, comme le *Contrast Checker* de WebAIM |

## Médias et polices

| Limite | Contournement |
|---|---|
| Pas de dossiers dans la médiathèque | Les **tags** et la recherche |
| Pas de remplacement d’un fichier par une nouvelle version | Importez la nouvelle version, choisissez-la dans les éléments, retirez l’ancienne |
| Pas de nettoyage automatique des médias inutilisés | Repérez l’indication « inutilisé » et retirez-les |
| Les images de fond ne sont pas optimisées à l’export | Préparez-les : 1920 px de large au plus, moins de 500 Ko |
| Polices : WOFF2 seulement, catalogue en jeu de caractères latin | Convertissez une police TTF ou OTF en WOFF2 (si sa licence l’autorise) ; pour une autre écriture, importez un fichier qui la couvre |

## Site et équipe

| Limite | Contournement |
|---|---|
| Un seul header et un seul footer | Masquez-les sur une page et construisez-y les siens |
| Pas de comptes ni de droits : toute l’équipe a tous les droits | Organisez-vous : un projet, une personne à la fois |
| Deux personnes sur le même projet : la seconde à enregistrer est prévenue d’un conflit | Rechargez la page pour repartir de la version enregistrée, ou choisissez d’écraser |
| Un projet supprimé part dans une corbeille du serveur, sans restauration depuis l’interface | Demandez à l’administrateur de le récupérer |

## Export et publication

| Limite | Contournement |
|---|---|
| Le site statique se construit sur le serveur du Studio, en une à quelques minutes, sans barre de progression | Patientez sans fermer la fenêtre d’export |
| La fenêtre d’export ne garde pas la liste des exports précédents | Téléchargez les archives dès la fin de l’export |
| Les archives sont au format `.tar.gz`, pas `.zip` | macOS et Windows 11 les ouvrent ; sinon 7-Zip |
| Pas de publication automatique chez un hébergeur | Dépôt manuel des fichiers (chapitre [Publier et livrer](11-publish-and-deliver.md)) |
| Des sources modifiées à la main par un développeur ne se réimportent pas | Décidez qui fait évoluer le site : le Studio ou le code |

Une limite vous gêne souvent ? Signalez-la à l’équipe : c’est ainsi que se décident les prochaines évolutions.
