# Jalon 1 — Visual Editor

**Document :** `docs/specifications/01-visual-editor.md`  
**Version :** 0.1  
**Dépendance :** `00-foundations.md`

## 1. Objectif

Développer un éditeur web capable de créer une page HTML structurée à partir de composants visuels et de l'exporter en projet Astro autonome.

À la fin de ce jalon, un concepteur doit pouvoir :

1. Ouvrir un document.
2. Ajouter et organiser des composants.
3. Modifier visuellement leurs propriétés.
4. Visualiser immédiatement les changements.
5. Annuler et rétablir ses opérations.
6. Enregistrer et recharger son travail.
7. Exporter un projet Astro compilable.
8. Vérifier la fidélité entre l'aperçu et le résultat exporté.

## 2. Périmètre fonctionnel

### VE-01 — Interface de l'éditeur

L'application présente :

- Barre supérieure : nom du document, sauvegarde, annuler/refaire, aperçu, export.
- Panneau gauche : bibliothèque de composants et arborescence.
- Canvas central : représentation visuelle de la page.
- Panneau droit : inspecteur des propriétés du composant sélectionné.
- Sélecteur de dimensions d'aperçu.

Les panneaux doivent pouvoir défiler indépendamment du canvas.

Le graphiste peut modifier les principales dimensions de son espace de travail.

**Acceptation :**
- L'utilisateur sélectionne un composant depuis le canvas ou l'arborescence.
- La sélection est synchronisée entre les panneaux.
- L'inspecteur affiche les propriétés appropriées.
- Le site reste prévisualisable sans les contrôles de l'éditeur.

### VE-02 — Modèle documentaire

Implémenter un arbre de composants conforme aux invariants du document de fondations.

Il doit gérer :

- Identifiants uniques.
- Types de composants.
- Propriétés.
- Enfants autorisés.
- Styles.
- Métadonnées minimales.
- Version du schéma.

Le modèle ne doit pas contenir d'éléments React, de références au DOM ou d'objets non sérialisables.

**Acceptation :**
- Un document est validé avant chargement.
- Les références et types inconnus provoquent un diagnostic contrôlé.
- Une sérialisation suivie d'une désérialisation conserve le document.
- Les versions de schéma non prises en charge sont refusées explicitement.

### VE-03 — Registre de composants

Définir une API d'enregistrement comprenant :

- Identifiant de type.
- Nom et catégorie.
- Propriétés autorisées.
- Valeurs par défaut.
- Règles d'imbrication.
- Configuration de l'inspecteur.
- Règles de rendu.
- Éventuelles dépendances de styles ou scripts.

Le registre doit pouvoir être enrichi sans modifier les composants fondamentaux de l'éditeur.

### VE-04 — Premiers composants

Implémenter :

| Composant | Fonctions essentielles |
|---|---|
| Container | Structure, largeur, fond, marges, padding |
| Stack / Flex | Direction, alignement, distribution, gap |
| Grid | Colonnes, gap, placement des enfants |
| Heading | Niveau sémantique, texte, typographie |
| Text | Paragraphe et contenu riche limité |
| Image | Source, alt, dimensions, ajustement |
| Button | Libellé, lien, apparence |
| Spacer / Divider | Espacement ou séparation |

Les sections, rangées et colonnes familières de Tatsu peuvent être proposées comme des presets de conteneurs.

Les éléments structurants ne doivent pas nécessairement reproduire sa hiérarchie stricte.

### VE-05 — Composition visuelle

Permettre :

- Ajout depuis la bibliothèque.
- Sélection.
- Suppression.
- Duplication.
- Réorganisation.
- Déplacement par glisser-déposer.
- Insertion dans un conteneur compatible.
- Copie/collage de composants à l'intérieur du document.

Les destinations interdites doivent être signalées avant la modification.

Ne jamais permettre de cycle dans l'arbre.

Les mouvements doivent conserver les identifiants existants.

### VE-06 — Inspecteur de propriétés

L'inspecteur est généré depuis les schémas des composants.

Types de contrôles initiaux :

- Texte.
- Nombre.
- Booléen.
- Sélection.
- Couleur.
- Dimensions avec unité.
- Espacements.
- Typographie.
- Alignements.
- Sélection d'image.
- Lien.

Organiser les propriétés en groupes :

- Content.
- Layout.
- Style.
- Advanced.

Les propriétés communes doivent être mutualisées.

Un champ invalide ne doit pas corrompre le document.

### VE-07 — Mise à jour et aperçu

La modification d'une propriété actualise visuellement l'élément concerné.

Le canvas doit utiliser le véritable rendu web, idéalement isolé de l'interface.

L'éditeur peut ajouter des overlays de sélection, mais ceux-ci ne doivent pas faire partie des éléments exportés.

Le rendu doit utiliser un contrat partagé avec l'exporteur.

Si la prévisualisation nécessite un service de rendu Astro, ce service doit être documenté, isolé et conçu pour éviter une reconstruction intégrale à chaque frappe.

### VE-08 — Responsive initial

Proposer :

- Desktop.
- Tablet.
- Mobile.
- Largeur personnalisée.

Permettre des variantes par breakpoint sur au minimum :

- Espacements.
- Direction Flex.
- Colonnes Grid.
- Alignement.
- Tailles typographiques.
- Visibilité.

Les valeurs non définies à un breakpoint héritent selon une règle explicite documentée.

L'éditeur ne doit pas limiter le nombre de breakpoints possibles dans le modèle interne, même si l'interface n'en expose que quelques-uns.

### VE-09 — Historique et transactions

Implémenter :

- Undo.
- Redo.
- Regroupement des modifications continues.
- Réinitialisation de l'historique après chargement.
- Indication des modifications non enregistrées.

Un déplacement de slider doit produire une transaction logique, pas des dizaines d'étapes d'annulation.

### VE-10 — Persistance

Premier adaptateur de stockage :

- Export JSON du document.
- Import JSON validé.
- Sauvegarde dans un environnement de développement contrôlé.

Un backend de persistance minimal ou un mécanisme d'enregistrement navigateur peut être utilisé pour le prototype.

Le choix définitif d'une base de données est hors périmètre.

Les échecs de sauvegarde doivent être visibles et ne doivent jamais entraîner silencieusement la perte des modifications.

### VE-11 — Export Astro

Produire un projet comprenant :

- `package.json`.
- Configuration Astro.
- Pages.
- Composants nécessaires.
- CSS.
- Assets.
- Instructions de compilation.

Le générateur peut utiliser des composants Astro partagés, à condition de produire des sources compréhensibles et autonomes.

Ne pas incorporer les contrôles de l'éditeur dans l'export.

**Critères d'acceptation :**

- Le projet s'installe à partir du lockfile fourni.
- La commande de build réussit.
- Une page HTML est générée.
- Les styles et médias sont accessibles.
- Aucun accès au Studio n'est requis pour afficher la page.
- Le code produit ne nécessite pas WordPress.

### VE-12 — Fidélité visuelle

Établir un jeu de documents de référence comprenant :

- Typographie simple.
- Composition Flex.
- Composition Grid.
- Images.
- Espacements.
- Variantes responsive.
- Composants imbriqués.

Comparer la prévisualisation et la page construite à viewport, navigateur, polices et données identiques.

Les écarts doivent être mesurés et documentés.

## 3. Hors périmètre

- Gestion de plusieurs sites.
- Navigation multipage.
- CMS éditorial.
- Comptes utilisateurs.
- Collaboration temps réel.
- Historique partagé.
- Animations complexes.
- Timeline.
- IA générative.
- Plugins tiers.
- Formulaires dynamiques.
- Publication sur serveur distant.

## 4. Contraintes techniques

- TypeScript strict.
- React moderne.
- Modèle documentaire indépendant de React.
- Validation des documents aux frontières.
- Absence de mutation directe incontrôlée de l'arbre.
- Rendu HTML sémantique.
- Styles typés et contrôlés.
- Pas de JavaScript personnalisé arbitraire dans les composants.
- Dépendances documentées.

## 5. Plan de développement agentique

### Lot VE-A — Initialisation

- Structure du projet.
- Outillage TypeScript.
- Lint et formatage.
- Tests unitaires.
- Environnement de développement.
- Première application React.

**Livrable :** application initiale exécutable.

### Lot VE-B — Document Model

- Schémas.
- Types.
- Validation.
- Sérialisation.
- Commandes élémentaires.
- Tests.

**Livrable :** moteur documentaire testable sans interface graphique.

### Lot VE-C — Registry & Renderer

- Contrat des composants.
- Registre initial.
- Composants fondamentaux.
- Moteur de styles.
- Rendu de référence.

**Livrable :** document affiché à partir de JSON.

### Lot VE-D — Editor Shell

- Panneaux.
- Canvas.
- Sélection.
- Arborescence.
- Inspecteur initial.

**Livrable :** propriétés modifiables visuellement.

### Lot VE-E — Composition

- Insertion.
- Drag & drop.
- Duplication.
- Suppression.
- Undo/redo.
- Responsive.

**Livrable :** véritable page éditable.

### Lot VE-F — Persistance & Export

- Sauvegarde/chargement.
- Génération Astro.
- Compilation isolée.
- Tests de fidélité.

**Livrable :** page Astro exportée depuis l'éditeur.

Les lots sont séquentiels au niveau des contrats, mais des sous-tâches peuvent être parallélisées après stabilisation des interfaces.

## 6. Démonstration de fin de jalon

Créer une page comprenant :

- Une section hero.
- Un titre et un paragraphe.
- Un bouton.
- Une image.
- Une grille de trois cartes.
- Une disposition mobile adaptée.

Modifier son design, enregistrer, fermer/recharger, puis exporter.

Exécuter le projet Astro indépendamment du Studio.

## 7. Definition of Done

- Scénario démontrable de bout en bout.
- Export Astro autonome.
- Composants fondamentaux opérationnels.
- Sélection et manipulation visuelles.
- Historique fiable.
- Sauvegarde/chargement.
- Tests du modèle documentaire.
- Tests de rendu et d'export.
- Contrôles d'accessibilité de base.
- Documentation des limites.
- Aucun blocage empêchant le jalon 2.

