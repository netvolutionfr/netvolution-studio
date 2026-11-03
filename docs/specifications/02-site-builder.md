# Jalon 2 — Site Builder

**Document :** `docs/specifications/02-site-builder.md`  
**Version :** 0.1  
**Dépendances :** `00-foundations.md`, `01-visual-editor.md`

## 1. Objectif

Étendre Visual Editor pour permettre la création et l'export d'un site vitrine multipage complet.

Le concepteur doit pouvoir gérer la structure, l'identité graphique, les ressources et la navigation depuis une seule application.

À l'issue du jalon, le produit doit permettre de réaliser un véritable site client.

## 2. Périmètre fonctionnel

### SB-01 — Gestion des projets

Permettre de :

- Créer un projet.
- Le nommer.
- L'ouvrir.
- Le dupliquer.
- Le supprimer avec confirmation.
- Enregistrer les modifications.
- Définir sa langue et son URL canonique de référence.

Chaque projet possède un identifiant stable.

Les projets doivent être isolés dans leur stockage, y compris leurs ressources.

L'environnement de développement peut rester mono-utilisateur. L'architecture doit néanmoins permettre l'introduction ultérieure des comptes et des organisations.

### SB-02 — Gestion des pages

Créer une interface de gestion des pages comprenant :

- Ajout.
- Renommage.
- Duplication.
- Suppression.
- Réorganisation.
- Définition de la page d'accueil.
- Gestion des slugs.
- Pages publiables ou exclues de l'export.
- Métadonnées de base.

La structure des URL doit être indépendante des libellés visibles.

Une modification de slug doit signaler les éventuels liens internes concernés.

Ne pas créer automatiquement une hiérarchie d'URL à partir des menus : structure des pages et structure de navigation sont distinctes.

### SB-03 — Navigation

Créer un éditeur de menus.

Fonctions :

- Plusieurs menus nommés.
- Entrées liées à une page.
- Entrées liées à une URL externe.
- Libellés personnalisés.
- Réorganisation.
- Sous-menus à profondeur limitée dans le premier rendu.
- États actif et courant.
- Navigation responsive.

Une page peut exister sans figurer dans un menu.

Une page peut apparaître dans plusieurs menus.

Les liens internes doivent utiliser des références aux pages plutôt que de simples URL copiées.

### SB-04 — Header et footer

Permettre de concevoir des compositions partagées.

Le header doit notamment accepter :

- Logo.
- Navigation.
- Boutons.
- Conteneurs et compositions.
- Variantes responsive.

Le footer doit accepter :

- Texte.
- Images.
- Liens.
- Menus.
- Colonnes et composants standards.

La modification d'un header ou footer partagé doit se répercuter sur toutes les pages auxquelles il est appliqué.

Le modèle doit permettre plusieurs variantes, même si la première interface peut se limiter à un header et un footer principaux.

### SB-05 — Design System

Créer un espace de configuration globale.

#### Couleurs

- Couleurs nommées.
- Palette principale.
- Variables globales.
- Références depuis les composants.

#### Typographie

- Familles de polices.
- Styles de titres.
- Texte courant.
- Graisses.
- Tailles.
- Interlignes.
- Espacements.
- Variantes responsive.

#### Espacements

- Échelle d'espacement.
- Valeurs réutilisables.
- Valeurs personnalisées autorisées.

#### Autres tokens

- Rayons.
- Ombres.
- Largeurs maximales.
- Breakpoints.

La modification d'un token doit se répercuter sur les composants qui le référencent.

Les valeurs personnalisées doivent rester possibles.

### SB-06 — Médiathèque

Permettre :

- Import d'images.
- Import de SVG valides et sûrs.
- Import de fichiers téléchargeables.
- Organisation et recherche.
- Prévisualisation.
- Métadonnées.
- Texte alternatif.
- Détection des ressources manquantes.
- Réutilisation sur plusieurs pages.

Les composants référencent les médias par identifiant stable.

Le système doit prévoir l'optimisation des images à l'export :

- Formats adaptés.
- Dimensions appropriées.
- Variantes responsive lorsque pertinent.
- Lazy-loading pour les images non prioritaires.
- Préservation des médias originaux dans les données du projet.

Le traitement des SVG et fichiers importés doit respecter une politique de sécurité explicite.

### SB-07 — Composants enrichis

Étendre la bibliothèque pour couvrir les besoins courants d'un site vitrine :

- Logo.
- Navigation.
- Liste de liens.
- Cartes.
- Galerie simple.
- Vidéo intégrée.
- Icônes.
- Call to action.
- Accordéon accessible.
- Onglets accessibles.

Les fonctionnalités interactives doivent charger uniquement le JavaScript nécessaire.

Un module de formulaire peut proposer son apparence, mais sa soumission vers un backend n'est pas exigée dans ce jalon.

### SB-08 — SEO et paramètres des pages

Chaque page doit accepter :

- Titre SEO.
- Meta description.
- Canonical.
- Statut d'indexation.
- Image de partage.
- Données Open Graph pertinentes.

L'export doit générer :

- Sitemap.
- Robots.txt.
- HTML sémantique.
- Métadonnées.
- Pages d'erreur nécessaires, notamment 404.

Les redirections doivent être représentables dans le modèle et exportables sous forme de configuration documentée compatible avec la cible, sans prétendre qu'un fichier statique impose à lui seul des redirections HTTP.

### SB-09 — Prévisualisation du site

Permettre de naviguer dans l'ensemble du site avant export.

La prévisualisation doit gérer :

- Liens internes.
- Menus.
- Pages communes.
- Header/footer.
- Styles globaux.
- Assets.
- Comportement responsive.

L'utilisateur doit pouvoir ouvrir une prévisualisation sans les outils d'édition.

### SB-10 — Export complet Astro

L'export doit produire un projet Astro standard avec :

- Toutes les pages exportables.
- Les composants utilisés.
- Le design system.
- La navigation.
- Les layouts partagés.
- Les médias.
- Les métadonnées.
- Le sitemap et les fichiers nécessaires.
- Les dépendances et versions figées.
- Une documentation d'installation.

Prévoir deux livrables distincts :

1. **Sources Astro**, modifiables et compilables.
2. **Build statique**, directement hébergeable.

Il ne faut pas dépendre d'un service Netvolution pour compiler ou servir le site.

### SB-11 — Contrôles avant export

Exécuter au minimum :

- Validation du modèle.
- Détection des liens internes cassés.
- Détection des médias manquants.
- Contrôle des slugs dupliqués.
- Contrôle des métadonnées essentielles.
- Contrôles automatisables d'accessibilité.
- Contrôles des ressources et dépendances.
- Build Astro.

Distinguer les erreurs bloquantes des avertissements.

### SB-12 — Réversibilité

Le projet exporté doit être compréhensible par un développeur connaissant Astro, sans connaissance préalable du fonctionnement interne de Netvolution Studio.

Inclure :

- README.
- Scripts de build.
- Versions des outils.
- Inventaire des médias.
- Structure documentée.
- Instructions de déploiement sur un serveur web standard.

Le format documentaire source doit également pouvoir être exporté pour archivage et réimport dans une version compatible du Studio.

La réimportation arbitraire de code Astro modifié par un tiers n'est pas exigée.

## 3. Sécurité et performance

Le site généré :

- Ne doit comporter aucune interface d'administration.
- Ne doit exposer aucune API d'édition.
- Ne doit dépendre d'aucune base de données pour l'affichage des pages statiques.
- Ne doit embarquer aucun secret.
- Ne doit pas charger globalement des bibliothèques inutilisées.
- Doit pouvoir fonctionner avec JavaScript désactivé pour les contenus et la navigation de base.

Les interactions nécessitant JavaScript doivent dégrader leur comportement de façon documentée.

Le site doit être testable avec Lighthouse et des outils d'accessibilité automatisés.

Les seuils chiffrés de performance seront définis sur des pages de référence et un environnement de mesure stable, avant validation du jalon.

## 4. Hors périmètre

- Administration éditoriale multi-utilisateur.
- Authentification visiteurs.
- E-commerce.
- Base de données publique.
- Blog dynamique alimenté par CMS.
- Traduction multilingue complète.
- Formulaires avec backend intégré.
- Déploiement automatique vers tous les hébergeurs.
- Collaboration temps réel.
- Animations complexes.
- Assistance IA.

## 5. Plan de développement agentique

### Lot SB-A — Site Model

Gestion des projets, pages, slugs et références.

### Lot SB-B — Navigation

Menus, liens internes et composants de navigation.

### Lot SB-C — Shared Layouts

Headers, footers et compositions partagées.

### Lot SB-D — Design System

Couleurs, typographie, espacements et tokens.

### Lot SB-E — Assets

Médiathèque, référencement et optimisation.

### Lot SB-F — SEO & Validation

Métadonnées, fichiers SEO, diagnostics et règles d'export.

### Lot SB-G — Full Site Export

Génération multipage, build statique, documentation et tests d'autonomie.

## 6. Démonstration de fin de jalon

Créer un site vitrine fictif comprenant :

- Accueil.
- Présentation.
- Services.
- Réalisations.
- Contact.

Le site doit avoir :

- Une identité graphique commune.
- Un header responsive.
- Un footer partagé.
- Une navigation fonctionnelle.
- Plusieurs mises en page.
- Une galerie.
- Des médias optimisés.
- Des métadonnées SEO.
- Une page 404.

Exporter les sources et le build statique.

Construire les sources dans un environnement vierge, puis servir le build sans démarrer Netvolution Studio.

## 7. Definition of Done

- Création d'un site multipage sans intervention dans le code.
- Navigation et liens fonctionnels.
- Compositions partagées.
- Design system opérationnel.
- Médiathèque.
- Prévisualisation complète.
- Contrôles d'export.
- Build Astro autonome.
- Documentation de déploiement.
- Tests de non-régression.
- Site démonstrateur exploitable.

