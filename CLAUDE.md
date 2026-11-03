# CLAUDE.md — Netvolution Studio

> Instructions permanentes pour les agents intervenant sur Netvolution Studio (NS).
> Langue des échanges et de la documentation : français. Code, identifiants et API : anglais.

## 1. Vision et objectifs

Netvolution Studio est un **CMS visuel moderne**, conçu pour créer, gérer et publier des sites web professionnels. Il doit offrir la productivité d'un page builder comme Tatsu, sans dépendre de WordPress et sans reproduire sa complexité.

Priorités du produit :

1. **Sécurité par conception** : limiter l'exposition du back-office, réduire les dépendances et les possibilités d'injection, prévoir l'authentification forte et des permissions explicites.
2. **Performance structurelle** : sites publics statiques par défaut, HTML pré-rendu, CSS propre, JavaScript uniquement si nécessaire ; aucun CMS ou accès à la base de données pour servir une page statique.
3. **Simplicité et productivité** : concepteur visuel efficace, workflows intuitifs, puis administration éditoriale ciblée par rôle.
4. **Évolutivité** : composants déclaratifs, commandes métier structurées, futures intégrations IA, automatisations, API et MCP.
5. **Réversibilité** : sources, données et ressources exportables ; sites exploitables hors de Netvolution et documentés pour un tiers.

Tatsu/Oshine sont des **références fonctionnelles et ergonomiques**, pas des dépendances obligatoires. Aucune migration des sites WordPress existants n'est prévue dans le périmètre actuel. Ne pas développer de compatibilité WordPress ou de convertisseur de shortcodes sans demande explicite.

## 2. Portée et ordre des jalons

Les spécifications font autorité pour leur périmètre :

- `docs/specifications/00-foundations.md` — architecture et invariants communs.
- `docs/specifications/01-visual-editor.md` — **Jalon 1, livré et validé** : éditeur visuel d'une page, document JSON, canvas, inspecteur, composition, sauvegarde et export Astro fidèle. Bilan : `docs/architecture/tranche-5.md`.
- `docs/specifications/02-site-builder.md` — **Jalon 2, livré et validé** : projets et pages, menus, header/footer partagés, design tokens, médiathèque, responsive, SEO et export d'un site vitrine complet. Bilan : `docs/architecture/jalon-2-tranche-8.md` ; limites connues : `docs/limitations.md`.
- `docs/specifications/03-creative-studio.md` — **Jalon 3, livré et validé** : sections et composants réutilisables, modèles de site, composition avancée, animations déclaratives, couche de services et assistance IA par commandes structurées avec validation humaine. Bilan : `docs/architecture/jalon-3-tranche-8.md`. Les évolutions ne doivent pas casser les démonstrations ni le banc (`npm run demo`, `npm run demo:site`, `npm run demo:creative`, `npm run test:fidelity`).
- `docs/research/TATSU-ANALYSE.md` — recherche de référence, **non normative** (si présente).
- **Évolutions après le jalon 3** (ADR-0017 à ADR-0023 : styles décoratifs, polices importées, typographie fine, texte enrichi, Galerie, Bandeau défilant, Carrousel, CSS personnalisé). Limites : `docs/limitations.md`.
- `docs/guide/` — **guide d'utilisation** pour les graphistes (Astro Starlight, servi par le Studio à `/guide/`). Toute fonctionnalité visible le met à jour (chapitre concerné, annexes A et B) ; ses captures se régénèrent avec `npm run guide:screenshots`.
- `docs/research/essai-import-tatsu.md` — bilan d'un essai **jetable** de conversion d'un site Tatsu, pour mesurer les écarts ; ce n'est pas une fonctionnalité de migration (§1). Le dépôt est public (Apache-2.0) : aucun contenu, nom ou adresse de client n'y est versionné, ni le convertisseur propre à un site.

**Ne pas implémenter les jalons suivants par anticipation.** Autoriser les contrats et abstractions minimaux nécessaires pour éviter de bloquer leur évolution.

L'application doit rester fonctionnelle, testable et démontrable à la fin de chaque jalon.

### Hors périmètre des trois jalons

CMS éditorial complet et multi-utilisateur, interface d'administration client autonome, collaboration temps réel, e-commerce, marketplace, migration WordPress, publication automatisée multi-hébergeurs, serveur MCP public, gestion avancée des organisations, hébergement mutualisé complet. Ces éléments sont des évolutions envisagées, non des fonctionnalités déjà acquises.

## 3. Décisions techniques et hypothèses

- **Distribution principale : application web** utilisable dans les navigateurs modernes sur macOS, Windows et Linux, hébergée en instance privée pour l'équipe (`studio.netvolution.fr`, ADR-0015, ADR-0016). Pas de client desktop Tauri/Electron ni de SaaS multi-clients pour l'instant.
- **Langage principal : TypeScript strict** ; **interface : React moderne**.
- **Architecture : monolithe modulaire**, sans microservices ni multiplication prématurée des packages.
- **Site public : Astro**, en rendu statique par défaut et sans dépendance à NS à l'exécution.
- **Modèle : document et site structurés, sérialisables et versionnés**, indépendants de React, Astro et de tout CMS.
- **CSS : standards modernes** (Flexbox, Grid, variables, media/container queries), responsive explicite, design tokens.
- **Animations futures : modèle déclaratif**, CSS natif / Web Animations API en premier, Motion candidat ; GSAP soumis à vérification de licence avant toute intégration.
- **Persistance : adaptateur simple pour le prototype**, base de données, CMS tiers et backend définitif non décidés.
- **Rust/WASM, Tauri/Electron, Payload** : options futures, **pas** de dépendances à introduire sans décision argumentée.

Ces orientations ne dispensent pas d'un ADR pour les choix structurants ; ne pas présenter les options ouvertes comme définitivement choisies.

## 4. Séparation des responsabilités

Préserver les frontières suivantes, même si elles résident dans une seule application :

- `Site Model` : projets, pages, URLs, menus, layouts partagés, paramètres.
- `Document Model` : arbre des composants d'une page et ses propriétés.
- `Component Registry` : schémas, contraintes d'imbrication, valeurs par défaut, propriétés éditables et capacités de rendu.
- `Editor Core` : commandes, transactions, validation, sélection, historique undo/redo.
- `Visual Editor` : canvas, arborescence, inspecteur et interactions ; ne détient pas le modèle métier.
- `Design System` : tokens et styles réutilisables.
- `Assets` : références stables et traitements des médias.
- `Rendering / Astro Export` : rendu, génération et compilation, sans dépendance aux contrôles de l'éditeur.
- `Persistence / Content Adapters` : contrats permettant d'évoluer vers la gestion éditoriale sans coupler le document à un CMS.

**Ne pas confondre source de vérité documentaire et contenu éditorial externe.** Les futures données d'un CMS peuvent être liées aux composants sans être copiées systématiquement dans la composition.

## 5. Invariants du modèle

- JSON versionné (`schemaVersion`), validé à l'entrée et avant export.
- Identifiants stables et uniques ; types de composants explicites.
- Props typées, contraintes de composition explicites, aucune référence DOM/React non sérialisable.
- Références médias abstraites, non dépendantes des chemins d'hébergement.
- Commandes métier structurées (`insertNode`, `moveNode`, `updateNodeProps`, `removeNode`, etc.), utilisées par l'UI et plus tard par l'IA.
- Migrations documentaires documentées lorsqu'un format évolue.
- Pas d'exécution arbitraire de HTML/JS depuis les documents. Le seul CSS saisi à la main est la feuille du projet (ADR-0023) : toujours vérifiée par `checkCustomCss` et publiée depuis la sortie de l'analyseur (couche `@layer ns-custom`, au-dessus des styles générés dans `@layer ns`), jamais insérée telle quelle.
- Modifications transactionnelles, undo/redo cohérents ; un glissement de slider correspond à une action logique.

Le HTML exporté n'est **pas** le format de persistance principal.

## 6. Rendu, canvas et export

La fidélité entre aperçu et export est un risque architectural de premier ordre. **Valider la stratégie de rendu avant de développer beaucoup de composants.** Ne pas supposer qu'une version React et une version Astro seront identiques par nature.

- Tester le rendu avec le même viewport, les mêmes polices, les mêmes ressources et les mêmes données.
- Partager les règles et définitions lorsque possible ; éviter les implémentations métier divergentes.
- Séparer les overlays d'édition du DOM et des assets publics.
- L'export ne minifie pas le CSS (`cssMinify: false`) : le minificateur réécrivait des valeurs que le banc de fidélité compare.
- Un îlot qui modifie le balisage initial (onglets, bandeau, carrousel) tourne aussi dans le canvas (`canvasIslands`), pour que son DOM corresponde à l'export.
- Privilégier un canvas isolé (iframe si pertinent) et un protocole d'échange typé.
- Ne pas reconstruire intégralement la page sur chaque frappe si un mécanisme incrémental est possible.
- L'export Astro doit fournir **sources compréhensibles, dépendances figées, médias et README**, et compiler dans un environnement vierge, sans service privé NS.
- Pour un site complet (jalon 2), fournir aussi un build statique hébergeable indépendamment.

La réversibilité ne signifie pas le réimport automatique de sources Astro modifiées par un tiers.

## 7. Expérience de conception

L'éditeur doit rester accessible aux graphistes sans programmation : sélection directe, arborescence, glisser-déposer, inspecteur déclaratif, inline editing lorsque pertinent, raccourcis, undo/redo, previews responsive, templates.

S'inspirer de Tatsu pour la familiarité, de Figma/Webstudio pour les manipulations et contraintes ; ne pas reproduire obligatoirement `Section > Row > Column > Module` comme hiérarchie interne. Proposer les compositions usuelles sous forme de presets de conteneurs Flex/Grid.

Ne jamais sacrifier la sémantique HTML, l'accessibilité ou le responsive à une liberté de positionnement illimitée.

## 8. Sécurité et confidentialité

- Valider tous les documents et fichiers importés ; filtrer les HTML, SVG et URLs selon leur contexte.
- Ne pas autoriser un document à exécuter librement du JavaScript, ni à injecter des scripts arbitraires dans la prévisualisation ou l'export.
- Séparer l'interface d'administration et le site public ; aucun secret dans le build ni dans les sources exportées.
- Sécuriser les chemins de fichiers, archives et accès aux médias ; aucune traversée de répertoire.
- Réduire les dépendances, surveiller leurs licences et correctifs.
- Ne pas inventer un système d'authentification maison. Pour un déploiement Internet avant l'authentification du produit, utiliser une protection d'accès externe éprouvée.
- Préparer conceptuellement rôles, permissions, passkeys/WebAuthn, audit et isolation des clients, **sans les développer dans le MVP**.
- Les futures opérations IA/MCP doivent appliquer les mêmes droits, validations et audits que les actions humaines ; publication sensible avec validation explicite.

## 9. Qualité des sites produits

- HTML sémantique, accessibilité clavier, focus visible, alternatives médias.
- Responsive robuste, pas de contenus cachés ou inaccessibles par défaut.
- Respect de `prefers-reduced-motion` pour les effets futurs.
- Métadonnées SEO, URLs, sitemap, robots, liens et 404 au jalon 2.
- JavaScript limité aux composants interactifs utilisés ; navigation et contenu de base accessibles sans JS.
- Tests de performance reproductibles ; définir les seuils sur des pages et environnements de référence, ne pas inventer des garanties chiffrées.

## 10. Méthode de travail agentique

Avant chaque tranche :

1. Lire ce fichier et les spécifications pertinentes.
2. Examiner le code et les contrats existants ; ne pas créer d'abstraction doublon.
3. Vérifier le jalon actif et définir une tâche au périmètre borné.
4. Identifier les fichiers et interfaces touchés, les risques et les tests d'acceptation.
5. Pour une décision structurante ou incertaine, rédiger un ADR avec alternatives et compromis.
6. Implémenter le plus petit incrément vertical testable.
7. Exécuter tests, lint/typecheck et build pertinents ; ne pas déclarer comme exécuté un test qui ne l'a pas été.
8. Résumer les modifications, limitations et points restant ouverts.

### Concurrence des agents

- Stabiliser les contrats avant le travail parallèle.
- Répartir les tâches par modules/fichiers et éviter les modifications simultanées d'un même contrat.
- Ne pas modifier un schéma central ou une API partagée sans signaler les consommateurs impactés.
- Ne pas refactoriser hors tâche sans justification.
- Documenter explicitement les choix provisoires et la dette introduite.

### Documentation et ADR prioritaires

- `ADR-0001` : document et composants versionnés.
- `ADR-0002` : stratégie de rendu fidèle preview ↔ Astro (**prioritaire**).
- `ADR-0003` : commandes, transactions et historique.
- `ADR-0004` : persistance MVP.
- `ADR-0005` : organisation du monorepo.

ADR acceptés depuis : `ADR-0006` (design system du Studio), `ADR-0007` (modèle de site v2), `ADR-0008` (persistance par
projet), `ADR-0009` (design tokens), `ADR-0010` (médiathèque et images), `ADR-0011` (composants réutilisables),
`ADR-0012` (animations déclaratives), `ADR-0013` (services et lots de commandes), `ADR-0014` (fournisseurs d'IA et
confidentialité), `ADR-0015` (hébergement Docker derrière nginx), `ADR-0016` (distribution : application web
hébergée, instance privée), `ADR-0017` (styles décoratifs : bordures, ombres, dégradés,
images de fond), `ADR-0018` (polices importées et catalogue de polices libres), `ADR-0019` (typographie fine, éléments
collants, retours à la ligne), `ADR-0020` (texte enrichi : paragraphes, couleur, titres enrichis, dégradé), `ADR-0021` (galerie en mosaïque et agrandissement), `ADR-0022` (bandeau défilant et carrousel), `ADR-0023` (CSS personnalisé : feuille du projet et classes), `ADR-0024` (internationalisation : catalogues de messages, anglais par défaut, français conservé) ; addendum « îlots JavaScript » d'`ADR-0002`.

Consigner les ADR selon l'organisation retenue dans `docs/architecture/adr/`.

## 11. Critères de fin de jalon

### Jalon 1 — Page éditable

Canvas, arbre, inspecteur, composants fondamentaux, responsive initial, commandes/undo-redo, document importable/exportable, génération Astro. Démontrer une page hero + texte + bouton + image + grille, éditée, sauvegardée et exportée ; compiler hors du dépôt NS et vérifier la fidélité du rendu.

### Jalon 2 — Site vitrine complet

Projets, pages, slugs, menus, header/footer, design tokens, médias, navigation responsive, métadonnées SEO, validation des liens, export Astro multipage et build statique. Démontrer un site vitrine de cinq pages, prévisualisable, exporté et servi indépendamment.

### Jalon 3 — Créativité et productivité

Sections/templates, instances réutilisables, composition avancée, animations déclaratives et accessibles, premières transformations IA via commandes typées, prévisualisation des différences et validation humaine. Démontrer le site du jalon 2 enrichi puis exporté sans dépendance de runtime au Studio.

**Definition of Done commune :** scénario complet fonctionnel, tests automatiques pertinents, build vérifié, documentation à jour, risques et limites connus explicités, aucun besoin d'une fonctionnalité du jalon suivant pour valider le résultat.

## 12. Principe directeur

**Construire d'abord le plus petit studio capable de produire un vrai site vitrine autonome.** Préserver les capacités nécessaires à un futur CMS éditorial sécurisé et à l'assistance IA, sans créer dès maintenant une usine à gaz ni enfermer les clients dans un runtime Netvolution.
