# Jalon 3 — Creative Studio

**Document :** `docs/specifications/03-creative-studio.md`  
**Version :** 0.1  
**Dépendances :** `00-foundations.md`, `01-visual-editor.md`, `02-site-builder.md`

## 1. Objectif

Améliorer la productivité et la liberté créative du Studio, sans sacrifier la qualité, la simplicité ou la portabilité des sites générés.

Le jalon introduit :

- Bibliothèques de sections et compositions.
- Templates de sites.
- Composants réutilisables.
- Contrôles de composition avancés.
- Animations et interactions déclaratives.
- Première assistance IA.
- Automatisation des opérations de création.

Le système doit rester accessible à un graphiste ne souhaitant pas programmer.

## 2. Périmètre fonctionnel

### CS-01 — Bibliothèque de sections

Permettre de créer et enregistrer des compositions réutilisables :

- Hero.
- Présentation.
- Features.
- Grilles.
- Témoignages.
- Tarifs.
- Équipe.
- Galerie.
- Call to action.
- Contact visuel.

Chaque composition doit comporter :

- Un identifiant.
- Un nom.
- Une catégorie.
- Une description.
- Une vignette.
- Une définition documentaire.
- Des paramètres personnalisables.
- Une version.

L'insertion d'une composition doit créer une instance indépendante par défaut.

### CS-02 — Templates de site

Permettre de créer un site à partir d'un modèle comprenant :

- Pages.
- Navigation.
- Header/footer.
- Design tokens.
- Compositions.
- Médias de démonstration redistribuables.

L'utilisateur doit pouvoir remplacer progressivement les contenus et le design.

Les modèles ne doivent pas dépendre d'un thème WordPress ou d'un service externe Netvolution.

### CS-03 — Composants réutilisables

Introduire des composants réutilisables avec propriétés paramétrables.

Distinguer :

- Copie indépendante.
- Instance liée à une définition partagée.

Une modification d'un composant partagé doit pouvoir être propagée à ses instances de manière contrôlée.

Les modifications incompatibles doivent être signalées.

Les références entre composants ne doivent jamais produire de dépendances circulaires.

### CS-04 — Outils de composition avancés

S'inspirer des capacités utiles des environnements de design modernes :

- Alignement.
- Distribution.
- Guides.
- Repères visuels.
- Ajustements directs.
- Redimensionnement.
- Gestion des contraintes.
- Positionnement relatif et, lorsque justifié, absolu.
- Gestion du débordement.
- Superposition des éléments.
- Transformations visuelles.

Les opérations doivent se traduire en règles web compréhensibles et responsive.

Ne pas adopter un modèle où tous les éléments sont positionnés absolument, au risque de produire des pages fragiles.

La composition structurée reste le mode normal.

### CS-05 — Animations déclaratives

Créer un modèle d'animation indépendant de toute bibliothèque particulière.

Déclencheurs initiaux :

- Chargement de page.
- Entrée dans le viewport.
- Hover.
- Focus.
- Clic lorsque pertinent.

Effets initiaux :

- Opacité.
- Translation.
- Échelle.
- Rotation.
- Combinaisons simples.

Paramètres :

- Durée.
- Délai.
- Easing.
- Direction.
- Répétition.
- Stagger pour les groupes.

Les animations doivent être modifiables depuis l'inspecteur.

### CS-06 — Moteur d'animation

Privilégier :

1. CSS natif et Web Animations API lorsque suffisants.
2. Motion pour les effets nécessitant une bibliothèque.
3. D'autres moteurs uniquement après validation technique et juridique.

L'utilisation de GSAP doit être précédée d'une vérification explicite de la licence applicable à un produit de type visual website builder.

Le modèle documentaire ne doit pas dépendre des noms de fonctions d'une bibliothèque d'animation.

L'export doit inclure uniquement le runtime nécessaire.

### CS-07 — Prévisualisation des animations

Permettre :

- Activation et désactivation.
- Relecture d'un effet.
- Modification des paramètres.
- Observation du comportement responsive.
- Désactivation ou adaptation lorsque l'utilisateur préfère réduire les animations.

Les animations déclenchées par le scroll doivent être reproductibles en aperçu.

Les contrôles de l'éditeur ne doivent pas être animés par le moteur d'animation du site.

### CS-08 — Assistance IA éditoriale

Premières fonctionnalités :

- Proposer un titre.
- Reformuler un texte.
- Résumer un contenu.
- Adapter un ton rédactionnel.
- Proposer des métadonnées SEO.
- Proposer une structure de page à partir d'un brief.

Le système doit rendre visibles les changements proposés avant leur application.

L'IA ne publie pas automatiquement.

Les contenus générés doivent être validés par l'utilisateur.

### CS-09 — Assistance IA au design

Permettre de soumettre des demandes telles que :

- « Ajoute une section de témoignages. »
- « Transforme cette grille en deux colonnes sur tablette. »
- « Harmonise les espacements. »
- « Propose une variante plus sobre du hero. »
- « Applique la palette du site à cette composition. »

L'IA doit produire des opérations structurées validées par le moteur documentaire.

Ne pas autoriser un modèle à modifier directement les fichiers sources ou les données internes de manière incontrôlée.

Prévoir :

- Prévisualisation des propositions.
- Diff lisible.
- Acceptation ou rejet.
- Undo.
- Journalisation des opérations.

### CS-10 — Interface d'automatisation

Exposer les commandes métier via une couche de services interne.

Prévoir des contrats compatibles avec un futur serveur MCP.

Les commandes doivent définir :

- Paramètres.
- Validation.
- Autorisations requises.
- Effets.
- Résultat.
- Erreurs.
- Capacité d'annulation éventuelle.

Le premier jalon IA n'exige pas de serveur MCP public accessible sur Internet.

### CS-11 — Abstraction des fournisseurs IA

L'intégration ne doit pas dépendre d'un unique fournisseur.

Prévoir :

- Interface de fournisseur.
- Configuration des modèles.
- Gestion des erreurs.
- Limites de consommation.
- Journalisation technique sans exposition inutile de contenus sensibles.
- Possibilité de désactiver l'IA.

Les clés API doivent rester côté serveur.

Les contenus envoyés aux modèles externes doivent être explicitement délimités et soumis à une politique de confidentialité.

### CS-12 — Qualité et accessibilité

Les fonctionnalités créatives doivent préserver :

- HTML sémantique.
- Navigation clavier.
- Focus visible.
- Responsive.
- Respect de `prefers-reduced-motion`.
- Performances acceptables.
- Absence de dépendances inutiles.

Les effets ne doivent pas empêcher l'accès au contenu.

Les contrôles automatisés ne remplacent pas une validation humaine d'accessibilité.

## 3. Hors périmètre

- Génération libre de JavaScript exécutable.
- Marketplace publique.
- Collaboration simultanée.
- Synchronisation Figma bidirectionnelle.
- Import universel de maquettes Figma.
- Génération automatique de sites complexes sans validation humaine.
- Création d'un moteur de rendu graphique propriétaire.
- Hébergement de modèles IA.
- Gestion éditoriale multi-utilisateur complète.
- Publication automatique par les agents.

## 4. Plan de développement agentique

### Lot CS-A — Library

Bibliothèque de sections, modèles et vignettes.

### Lot CS-B — Reusable Components

Instances liées, paramètres, versions, propagation.

### Lot CS-C — Advanced Layout

Guides, contraintes, alignements et transformations.

### Lot CS-D — Animation Model

Schémas, déclencheurs, effets, validation.

### Lot CS-E — Animation Runtime

Rendu, prévisualisation, export et accessibilité.

### Lot CS-F — AI Commands

API de commandes, validation, transactions et prévisualisation.

### Lot CS-G — AI Provider

Intégration d'un fournisseur configurable, gestion des secrets et des erreurs.

### Lot CS-H — AI Features

Assistance rédactionnelle et transformations de compositions.

### Lot CS-I — Quality & Export

Tests de régression, performances, sécurité et export autonome.

## 5. Scénario de démonstration

Partir d'un site créé au jalon 2.

1. Insérer une section hero depuis la bibliothèque.
2. Modifier ses paramètres et couleurs.
3. Enregistrer une composition personnalisée.
4. Réutiliser cette composition sur une autre page.
5. Ajouter une animation d'entrée.
6. Vérifier le comportement mobile.
7. Demander à l'IA de proposer une variante.
8. Examiner les modifications proposées.
9. Accepter la proposition.
10. Annuler puis rétablir l'opération.
11. Exporter le site Astro.
12. Vérifier le fonctionnement et les performances du site exporté.

## 6. Definition of Done

- Bibliothèques de sections et templates fonctionnelles.
- Composants réutilisables et versionnés.
- Composition avancée sans rupture du responsive.
- Animations déclaratives fonctionnelles.
- Respect du reduced motion.
- Assistance IA opérationnelle sur des commandes structurées.
- Validation humaine des modifications IA.
- Export Astro autonome.
- Absence de secret dans les exports.
- Tests et documentation.
- Démonstration complète reproductible.

