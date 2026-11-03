---
title: "Annexe D. Dépannage, FAQ et glossaire"
---

## Dépannage

**Un message « Refusé : … » apparaît en bas de l’écran.**
L’action demandée n’est pas possible : un élément ne peut pas aller à cet endroit (un titre dans un accordéon, par exemple), une valeur est hors limites, un média ou une couleur est encore utilisé. Le message dit pourquoi ; rien n’a été modifié.

**« Échec » à l’enregistrement, avec un bouton « Écraser la version du serveur ».**
Quelqu’un d’autre a enregistré ce projet depuis que vous l’avez ouvert. **Écraser** remplace sa version par la vôtre ; sinon, notez vos changements, rechargez la page et refaites-les sur la version à jour.

**Mon titre ne change pas de taille sur mobile.**
Vérifiez le breakpoint affiché dans la barre d’outils : une valeur réglée en Desktop s’applique partout, sauf si une valeur Tablette ou Mobile la remplace (point plein devant le réglage). La flèche circulaire la réinitialise.

**Je ne trouve pas un élément dans le canvas.**
Il est peut-être masqué sur ce breakpoint, vide ou sans fond : passez par l’**arborescence**.

**Un lien ou un bouton ne réagit pas au clic.**
C’est normal dans le canvas, où un clic sélectionne. Testez la navigation dans l’**Aperçu du site**.

**Ma police ne s’affiche pas.**
Vérifiez que la police est bien importée (médiathèque, « Police ») et que son nom figure **en premier** dans la police du design system, écrit exactement comme la famille du média (`Inter, sans-serif`). Puis que l’élément utilise cette police, directement ou par son style de texte.

**Ma règle du CSS du projet ne s’applique pas.**
Lisez les messages sous l’éditeur : tant qu’une **erreur** reste, c’est la dernière version valide qui s’applique. Vérifiez ensuite que l’élément porte bien la classe (inspecteur, section Avancé, **Classes CSS**) et que le sélecteur l’écrit avec un point (`.carte-relief`). Les **avertissements** n’empêchent rien.

**L’export est refusé (« erreurs bloquantes »).**
Cliquez sur chaque erreur pour aller à l’élément concerné : le plus souvent un lien vers une page non publiée ou un média manquant.

**Le site en ligne n’affiche pas mes dernières modifications.**
Vérifiez que vous avez enregistré, exporté **à nouveau**, puis remplacé **tous** les fichiers chez l’hébergeur. Videz le cache du navigateur (<kbd>⌘</kbd> <kbd>⇧</kbd> <kbd>R</kbd>).

**Les pages s’affichent en ligne, mais pas la page 404, ou les redirections ne marchent pas.**
Elles demandent une configuration de l’hébergeur (chapitre [Publier et livrer](11-publier-et-livrer.md)).

**Les images ou le style manquent en ligne.**
Le site doit être à la **racine** du domaine, et c’est **le contenu** du dossier exporté qu’il faut copier, pas le dossier lui-même.

## Questions fréquentes

**Puis-je importer un site WordPress, Tatsu ou Elementor ?**
Non. Reconstruisez-le dans le Studio, en partant d’un modèle ; c’est souvent l’occasion de le simplifier.

**Le client peut-il modifier son site lui-même ?**
Pas encore : le Studio est réservé à l’équipe. Les modifications passent par vous, puis par un nouvel export.

**Où sont hébergés les sites ?**
Où vous voulez : le Studio produit des fichiers, à déposer chez n’importe quel hébergeur (chapitre [Publier et livrer](11-publier-et-livrer.md)).

**Mes projets sont-ils sauvegardés ?**
Sur le serveur du Studio, à chaque enregistrement. Pour une copie à vous, exportez l’**archive du projet** (menu **⋯**).

**Puis-je utiliser une police achetée par le client ?**
Si sa licence autorise l’usage sur le web : importez son fichier WOFF2 (chapitre [Le design system](05-design-system.md)).

**L’assistant IA voit-il tout le site ?**
Non : la sélection (ou la page), sa structure et ses textes seulement (chapitre [L’assistant IA](10-assistant-ia.md)).

**Le site exporté dépend-il de Netvolution ?**
Non. Il fonctionne seul, sans le Studio ni aucun service Netvolution ; ses sources sont un projet Astro standard.

## Glossaire

| Terme | Définition |
|---|---|
| **Arborescence** | La structure de la page, sous forme d’arbre, à gauche |
| **Astro** | L’outil standard qui construit le site à partir des sources exportées |
| **Breakpoint** | Une taille d’écran à partir de laquelle des réglages changent : Desktop (base), Tablette, Mobile |
| **Canvas** | La zone centrale, où la page s’affiche telle qu’elle sera publiée |
| **Composant** | Un élément de la bibliothèque : titre, texte, image, pile… |
| **Composant réutilisable** | Une section conçue une fois, placée en plusieurs **instances** liées |
| **Composition** | Une structure de boîtes et de composants toute prête, à insérer |
| **Conteneur, Pile, Grille** | Les trois boîtes de mise en page : bloc simple, Flexbox (ligne ou colonne), colonnes égales |
| **Classe CSS** | Un nom donné à un élément (inspecteur, Avancé), que vise la feuille CSS du projet |
| **Design system** | Les couleurs, tailles, polices, styles de texte et la feuille CSS du site |
| **Export** | La production des fichiers du site (statique et sources) |
| **Gap** | L’espacement entre les éléments d’une pile ou d’une grille |
| **Header, Footer** | L’en-tête et le pied de page, communs aux pages |
| **Inspecteur** | Le panneau de droite, qui règle l’élément sélectionné ou la page |
| **Instance** | Un exemplaire placé d’un composant réutilisable |
| **Marge, Padding** | L’espace autour d’un élément, et l’espace entre son bord et son contenu |
| **Médiathèque** | Les images, SVG, polices et fichiers du projet |
| **Meta description** | Le résumé d’une page affiché par les moteurs de recherche |
| **Modèle de site** | Un projet complet servant de point de départ |
| **Mouvement réduit** | Un réglage du système du visiteur qui demande moins d’animations |
| **Open Graph** | L’image et le texte affichés quand une page est partagée sur les réseaux |
| **Redirection 301** | Le renvoi permanent d’une ancienne adresse vers une nouvelle |
| **Site statique** | Des pages HTML prêtes à l’emploi, sans base de données ni serveur d’application |
| **Sitemap** | La liste des pages du site, destinée aux moteurs de recherche |
| **Slug** | La fin de l’adresse d’une page : `tarifs` dans `/tarifs/` |
| **Texte alternatif** | La description d’une image, lue par les lecteurs d’écran |
| **Token** | Une valeur nommée du design system (« Primaire », « Section ») |
| **WOFF2** | Le format de fichier des polices pour le web |
