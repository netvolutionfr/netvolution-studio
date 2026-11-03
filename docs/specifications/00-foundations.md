# Netvolution Studio — Fondations et architecture

**Document :** `docs/specifications/00-foundations.md`  
**Version :** 0.1  
**Statut :** Spécification initiale  
**Produit :** Netvolution Studio (NS)

## 1. Vision

Netvolution Studio est une plateforme web de conception, gestion et publication de sites web.

Elle vise à remplacer progressivement WordPress, Oshine et Tatsu pour les nouveaux projets de Netvolution, sans imposer la migration des sites existants.

Le produit doit permettre à un concepteur de créer visuellement un site, à un client de gérer ultérieurement ses contenus, et à un exploitant de publier le site sur une infrastructure indépendante.

Ses objectifs fondamentaux sont :

1. **Productivité :** permettre à un graphiste de créer rapidement des sites professionnels.
2. **Sécurité :** réduire l'exposition publique, les dépendances vulnérables et les erreurs de configuration.
3. **Performance :** générer des sites légers, statiques par défaut.
4. **Simplicité :** présenter les fonctionnalités pertinentes selon les rôles.
5. **Évolutivité :** intégrer progressivement IA, automatisations, API et MCP.
6. **Réversibilité :** garantir la possibilité d'exploiter les sites hors de Netvolution Studio.

L'expérience de Tatsu sert de référence ergonomique, mais ni son code ni son architecture ne constituent des dépendances obligatoires.

## 2. Périmètre des trois premiers jalons

### Jalon 1 — Visual Editor

Créer et modifier une page visuellement, enregistrer son document structuré et produire une page Astro fidèle.

### Jalon 2 — Site Builder

Créer un site vitrine complet : pages, menus, header/footer, médias, design system, responsive et export Astro autonome.

### Jalon 3 — Creative Studio

Accélérer et enrichir la conception grâce aux bibliothèques de compositions, aux animations et à l'assistance IA.

### Évolutions ultérieures

- CMS éditorial multi-utilisateur.
- Administration autonome par le client.
- Authentification forte et gestion avancée des droits.
- Workflows de publication.
- Connexions aux services tiers.
- API et serveur MCP de production.
- Déploiement et exploitation multi-tenant.
- Collaboration simultanée.

Ces évolutions doivent être facilitées par l'architecture, mais ne doivent pas être développées prématurément.

## 3. Principes architecturaux

### 3.1 Application web

L'interface principale fonctionne dans un navigateur moderne sur macOS, Windows et Linux.

Technologies privilégiées :

- TypeScript en mode strict.
- React pour l'interface.
- Astro comme première cible de publication.
- Standards HTML, CSS et JavaScript.

Une distribution desktop reste envisageable, mais n'est pas incluse dans les trois premiers jalons.

### 3.2 Monolithe modulaire

Privilégier un monolithe modulaire plutôt qu'une architecture microservices.

Les responsabilités doivent être isolées par des contrats explicites :

- Modèle de site.
- Modèle documentaire.
- Registre de composants.
- Moteur de mise en page et de styles.
- Éditeur visuel.
- Gestion des médias.
- Rendu et export.
- Persistance.
- Automatisation.

Le découpage en packages ne doit intervenir que lorsqu'il apporte une séparation concrète.

### 3.3 Indépendance du CMS

Le modèle documentaire ne doit dépendre ni de WordPress, ni de Payload, ni d'un autre CMS.

Il doit être possible d'éditer et de construire un site sans CMS externe.

Les futurs CMS et services de contenus seront intégrés via des adaptateurs.

### 3.4 Modèle documentaire comme source de vérité

Les documents de conception sont des données structurées et versionnées.

Le HTML généré ne constitue pas leur format de stockage principal.

Le modèle doit distinguer :

- La définition du site.
- La structure et les propriétés des pages.
- Les contenus éditoriaux.
- Les ressources.
- Le design system.
- Les références aux composants.

La séparation présentation/contenu doit être possible, sans imposer un CMS complexe au premier jalon.

### 3.5 Publication statique par défaut

Les sites exportés sont pré-rendus avec Astro.

Un site public statique ne doit nécessiter aucun accès au CMS, à sa base de données ou à son interface d'administration.

Les fonctionnalités dynamiques devront ultérieurement être explicites et isolées.

### 3.6 Réversibilité

Un export doit pouvoir être compilé et exploité indépendamment du Studio.

Il doit contenir les sources, ressources, configurations et instructions nécessaires.

Les dépendances au runtime privé de Netvolution sont interdites pour l'exécution publique des sites exportés.

Ne pas promettre la conservation de l'édition visuelle dans un outil tiers : la réversibilité garantit d'abord un projet technique autonome et documenté.

## 4. Architecture logique

```text
Studio Web
   |
   +-- Site Manager
   +-- Visual Editor
   +-- Component Inspector
   +-- Design System
   +-- Asset Manager
   |
   v
Application Core
   |
   +-- Site Model
   +-- Document Model
   +-- Component Registry
   +-- Commands / Transactions
   +-- History / Validation
   |
   +-- Rendering Contract
   +-- Persistence Port
   +-- Content Binding Contract
   |
   v
Astro Adapter
   |
   +-- Preview
   +-- Static Build
   +-- Project Export
```

Le rendu de prévisualisation et le rendu exporté doivent partager autant que possible les mêmes définitions et règles.

Un composant ne doit pas nécessiter deux implémentations métier divergentes.

## 5. Modèle documentaire initial

Le format définitif doit être élaboré et validé durant le jalon 1.

Structure conceptuelle proposée :

```json
{
  "schemaVersion": 1,
  "site": {
    "id": "site-example",
    "name": "Example"
  },
  "design": {
    "tokens": {}
  },
  "pages": [
    {
      "id": "page-home",
      "slug": "/",
      "title": "Accueil",
      "root": {
        "id": "root-1",
        "type": "container",
        "props": {},
        "children": []
      }
    }
  ],
  "navigation": [],
  "assets": []
}
```

Ce modèle est une illustration, pas encore un schéma contractuel définitif.

### Invariants obligatoires

- Identifiant stable et unique pour chaque élément.
- Type de composant explicite.
- Propriétés validées par un schéma.
- Composition hiérarchique contrôlée.
- Format versionné.
- Sérialisation et désérialisation sans perte.
- Migrations prévues entre versions.
- Références aux médias indépendantes des URL physiques.
- Aucun code JavaScript arbitraire exécuté depuis le document.
- Erreurs de validation explicites.

## 6. Layout et styles

Le modèle doit utiliser les capacités modernes de CSS :

- Flexbox.
- CSS Grid.
- Variables CSS.
- Media queries.
- Container queries lorsque pertinent.
- Unités modernes et propriétés logiques.

L'interface doit offrir une composition structurée par défaut, sans interdire des compositions plus originales.

Les propriétés responsive doivent avoir un mécanisme d'héritage prévisible.

Les styles globaux doivent reposer sur des design tokens.

## 7. Architecture de l'éditeur

L'éditeur est constitué de :

- Un canvas représentant le site.
- Une arborescence des éléments.
- Un inspecteur de propriétés.
- Une bibliothèque de composants.
- Une barre d'outils.
- Une gestion de l'historique.
- Une interface de sauvegarde et d'export.

La sélection et les outils d'édition ne doivent pas modifier le contenu du site publié.

Le canvas doit reproduire le rendu réel, mais les contrôles de conception doivent en rester distincts.

Privilégier un aperçu isolé, notamment par iframe, avec un protocole de communication typé si nécessaire.

## 8. Gestion de l'état

Distinguer :

- État documentaire persistant.
- État temporaire de l'interface.
- État de sélection.
- État transactionnel des modifications.
- Historique annuler/refaire.
- État de persistance.

Les modifications doivent passer par des opérations structurées.

Exemples :

- `insertNode`
- `moveNode`
- `updateNodeProps`
- `removeNode`
- `duplicateNode`
- `updateDesignTokens`
- `createPage`

Ces opérations constitueront ultérieurement un point d'intégration naturel pour les automatisations et l'IA.

## 9. Sécurité et isolation

### Dès les premiers jalons

- Validation des documents importés.
- Protection contre l'injection de HTML ou JavaScript non autorisé.
- Interdiction de l'exécution libre de scripts depuis les propriétés des composants.
- Isolation des aperçus non fiables.
- Protection des chemins et fichiers lors de l'export.
- Vérification des dépendances logicielles.
- Aucune clé privée ou secret dans les projets générés.
- Politique CSP adaptée aux sites exportés, lorsqu'elle est applicable.
- Traitement sécurisé des fichiers médias.

### Pour le futur CMS

Prévoir les concepts nécessaires à :

- Identités et utilisateurs.
- Permissions granulaires.
- Passkeys/WebAuthn.
- MFA.
- Sessions sécurisées.
- Audit.
- Isolation multi-tenant.
- Validation humaine des publications.

Ne pas développer un mécanisme d'authentification maison.

Si la V0.1 est déployée sur Internet avant l'intégration d'une authentification éprouvée, en restreindre l'accès à un environnement interne ou protégé.

## 10. IA et automatisation

L'IA est une capacité transversale future.

Dès le départ :

- Exposer des opérations métier structurées.
- Définir des schémas de validation des entrées.
- Séparer les permissions des opérations.
- Prévoir les transactions et les annulations.
- Assurer la traçabilité des transformations.

L'IA ne doit pas modifier directement les structures internes du modèle documentaire en contournant les règles métier.

L'implémentation des modèles et fournisseurs IA ne doit pas être couplée au cœur du Studio.

## 11. Validation technique

Prévoir :

- Tests unitaires des modèles et commandes.
- Tests de validation documentaire.
- Tests de sérialisation.
- Tests des migrations.
- Tests de rendu.
- Tests visuels.
- Tests de navigation et d'export.
- Tests d'accessibilité automatisés.
- Tests de compilation des projets Astro exportés.
- Tests de sécurité des entrées non fiables.

L'export doit être testé dans un répertoire vierge, sans dépendre du monorepo.

## 12. Règles pour les agents de développement

1. Ne pas développer une fonctionnalité hors du jalon courant sans accord explicite.
2. Commencer par vérifier les contrats et les dépendances existants.
3. Proposer un ADR pour tout choix architectural structurant.
4. Produire des tests correspondant aux critères d'acceptation.
5. Ne pas faire passer un prototype temporaire pour une architecture stabilisée.
6. Ne pas ajouter de dépendance majeure sans justification.
7. Ne pas introduire de services externes indispensables sans nécessité.
8. Ne pas modifier le modèle documentaire sans prévoir sa compatibilité.
9. Maintenir la capacité de compilation et de démonstration à chaque incrément.
10. Documenter explicitement les fonctionnalités incomplètes et les limites.

## 13. Définition globale de terminé

Un jalon est terminé lorsque :

- Ses scénarios fonctionnels sont opérationnels.
- Les critères d'acceptation sont vérifiés.
- Les tests automatisables sont présents.
- La documentation correspond au comportement réel.
- Les principaux risques de sécurité ont été examinés.
- L'export fonctionne dans l'environnement prévu.
- Aucune dépendance au jalon suivant n'est nécessaire pour démontrer le résultat.

La livraison doit être accompagnée d'une démonstration reproductible et d'une liste des limitations connues.

