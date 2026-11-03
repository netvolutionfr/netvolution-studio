---
title: "0. Bienvenue"
---

Netvolution Studio est l’outil de l’équipe pour concevoir des sites vitrines visuellement, comme avec Tatsu ou Elementor, puis les publier sous forme de **sites statiques** : des pages HTML prêtes à l’emploi, rapides et sûres, qui fonctionnent sans le Studio ni WordPress.

## Ce qui ne change pas

Vous retrouverez vos réflexes de page builder :

- une **bibliothèque** d’éléments à glisser dans la page ;
- un **canvas** qui montre la page telle qu’elle sera publiée ;
- un **inspecteur** pour régler le contenu, les couleurs, les espacements et la mise en page de l’élément sélectionné ;
- une **arborescence** de la page (le « Navigator » d’Elementor) ;
- des aperçus **desktop, tablette et mobile**, avec des réglages propres à chaque taille d’écran ;
- des **couleurs et polices globales**, un **header** et un **footer** partagés, des **sections réutilisables** et des **modèles de site**.

## Ce qui change

> **Il n’y a pas de site « en ligne » dans le Studio.** Le Studio est un atelier. Quand le site est prêt, vous l’**exportez** : le Studio produit les fichiers du site, que l’on dépose ensuite chez n’importe quel hébergeur. Modifier le site, c’est le modifier dans le Studio puis exporter à nouveau.

- **Pas de WordPress, pas de plugins.** Les pages publiées ne contiennent ni base de données ni back-office : rien à mettre à jour, rien à pirater.
- **Pas de HTML ni de JavaScript libres.** Il n’existe pas de widget « HTML » ni de shortcode : tout passe par les composants et les réglages de l’inspecteur. C’est ce qui garantit des pages valides, accessibles et identiques entre le Studio et le site publié. Pour un effet que l’inspecteur ne propose pas, le designer peut écrire une **feuille CSS du projet**, contrôlée par le Studio (chapitre [Le design system](05-design-system.md)).
- **Une structure plus libre.** Pas de Section > Row > Column imposé : on emboîte des **conteneurs**, des **piles** (Flexbox) et des **grilles** (CSS Grid). Des compositions toutes faites (« Rangée 2 colonnes », « Hero »…) donnent les mises en page habituelles en un clic.
- **Les textes s’éditent dans l’inspecteur**, pas directement dans la page. On clique sur le texte dans le canvas, puis on le modifie à droite.
- **Le code produit appartient au client.** L’export est un projet [Astro](https://astro.build) standard et documenté : un développeur peut le reprendre sans le Studio.

## Se connecter

Le Studio est accessible à l’adresse **https://studio.netvolution.fr**, protégée par un identifiant et un mot de passe propres à chaque membre de l’équipe (demandez-les à l’administrateur). Il fonctionne dans les navigateurs récents, sur un écran d’ordinateur.

Une fois connecté, toute l’équipe partage les mêmes projets : il n’y a pas encore de comptes ni de droits différents. Évitez de modifier le même projet à deux en même temps : le second à enregistrer est prévenu d’un conflit et doit choisir quelle version garder.

## Et maintenant ?

Le plus simple est de suivre la [prise en main](01-getting-started.md) : en vingt minutes, vous aurez créé, modifié et exporté un site complet.
