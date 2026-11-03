# Étude d'architecture — Jalon 3 (Creative Studio)

**Statut :** décisions validées le 30/10/2026 (§10) ; ADR-0011 à ADR-0014 acceptés
**Date :** 30/10/2026
**Sources :** `CLAUDE.md`, `docs/specifications/00`, `03`, `docs/history/reports/jalon-2-tranche-8.md`, `docs/limitations.md`, code du jalon 2

Conventions : **[R]** recommandation, **[O]** décision ouverte, **[F]** fait vérifié dans le dépôt, **[H]** hypothèse à vérifier.

---

## 1. Point de départ [F]

Le jalon 2 livre un site multipage (`ns.site` v2) :

- **Modèle** : table plate de nœuds partagée par les pages et les layouts (header/footer), menus, tokens en variables CSS, médiathèque typée, SEO, redirections.
- **Commandes** : chaque commande (`commands.ts`) a un schéma zod de paramètres. Le store la valide entièrement (`loadSite`) après application, et gère l'historique par instantanés, les transactions et l'annulation.
- **Rendu et export** :
  - les mêmes vues React servent au canvas (iframe), à l'aperçu du site (`preview.html`) et à l'export Astro ;
  - JavaScript n'est présent que via des îlots `island.ts` par composant ;
  - un banc de fidélité multipage, axe, et deux démonstrations reproductibles (`npm run demo`, `npm run demo:site`).
- **Réutilisation existante** : des préréglages de bibliothèque (`presets.ts` : arbres statiques insérés comme copies) et des layouts partagés. Aucun composant réutilisable lié, aucune animation, aucune IA.

Points d'appui directs pour le jalon 3 :

| Besoin | Point d'appui existant |
|---|---|
| Sections, insertion | `NodeTemplate`, `insertTree`, `toTemplate` (copier/coller), presets |
| Composants liés | Layouts partagés (ADR-0007) : une racine de la table de nœuds réutilisée sur plusieurs pages |
| Animations | Îlots (addendum d'ADR-0002), `breakpointCss`, styles typés |
| IA et automatisation | Commandes typées et validées, transactions, journal (`HistoryEntry.commands`) |
| Prévisualisation des propositions | Store cloné hors historique, canvas piloté par message `render` |

## 2. Contrats retenus de la spécification 03

| Lot | Contrat minimal pour le jalon |
|---|---|
| CS-01 Sections | Bibliothèque intégrée (hero, présentation, features, grilles, témoignages, tarifs, équipe, galerie, CTA, contact) et sections enregistrées par l'utilisateur : id, nom, catégorie, description, vignette, définition, paramètres, version. Insertion = copie indépendante par défaut |
| CS-02 Templates de site | Créer un projet depuis un modèle complet (pages, menus, header/footer, tokens, compositions, médias redistribuables) ; « enregistrer ce projet comme modèle » |
| CS-03 Composants réutilisables | Copie indépendante ou instance liée ; propagation contrôlée d'une nouvelle version ; incompatibilités signalées ; pas de cycle |
| CS-04 Composition avancée | Alignement, distribution, redimensionnement direct, guides, position relative/absolue justifiée, débordement, superposition, transformations ; règles CSS responsives ; mode structuré par défaut |
| CS-05/06/07 Animations | Modèle déclaratif indépendant de toute bibliothèque ; déclencheurs chargement, viewport, hover, focus, clic ; effets opacité, translation, échelle, rotation ; durée, délai, easing, répétition, stagger ; runtime minimal ; relecture dans l'éditeur ; `prefers-reduced-motion` |
| CS-08/09 IA | Rédaction (titre, reformulation, résumé, ton, SEO, structure de page) et design (« ajoute une section… ») : **propositions = lots de commandes validées**, diff lisible, accepter/rejeter, undo, journal |
| CS-10 Automatisation | Couche de services sur les commandes : paramètres, validation, autorisations, effets, résultat, erreurs, annulation ; contrats compatibles MCP (JSON Schema), sans serveur MCP public |
| CS-11 Fournisseurs IA | Interface de fournisseur, configuration des modèles, erreurs, limites de consommation, journal technique sans contenu sensible, IA désactivable, clés côté serveur, contenu envoyé explicitement délimité |
| CS-12 Qualité | HTML sémantique, clavier, focus, responsive, reduced motion, performances, dépendances minimales |

## 3. Architecture proposée

```text
core/
  document/   + symbols (définitions de composants réutilisables), animations dans les nœuds
  editor/     commandes existantes + commandes de sections, symboles, layout avancé, animations
  services/   NOUVEAU : catalogue des commandes (métadonnées, JSON Schema, autorisations,
              annulation), exécution de lots transactionnels, journal (CS-10)
  ai/         NOUVEAU, sans dépendance réseau : contrat de fournisseur, construction des
              requêtes (contexte délimité), validation des réponses en lots de commandes
components/   + sections intégrées (sections.ts), runtime d'animation (îlot « animate »)
apps/studio/
  dev-server/ + /api/ai (proxy vers le fournisseur : clés, limites, journal), templates de site
  shell/      + panneau Sections, assistant IA (propositions, diff), poignées et guides du canvas,
              section Animation de l'inspecteur
```

L'IA ne touche jamais au document directement. Elle reçoit un contexte délimité et renvoie des appels de commandes. Le cœur les valide et les applique dans une **copie** du site pour la prévisualisation. Seule une acceptation humaine les rejoue dans le store, en une transaction annulable.

## 4. Décisions

### 4.1 Sections, composants réutilisables et versions (ADR-0011, accepté)

**Recommandation [R] : instances développées, synchronisées sur demande.**

- **Définitions partagées** : `site.symbols` (champ optionnel de la v2). Chaque définition `{ id, name, category, description, version, rootId, params[] }` est, comme un layout, une racine de la table de nœuds.
- **Instances** : une instance est une **copie** ordinaire du sous-arbre, dont la racine porte `instance: { symbolId, version, overrides }`. Le rendu, le canvas, l'export et le banc n'ont donc rien de nouveau à comprendre.
- **Propagation contrôlée** : la définition passe en version n+1 quand on l'édite. Les instances en retard sont signalées. La commande `updateInstances` reconstruit chaque instance depuis la définition en réappliquant ses `overrides` (valeurs des paramètres), avec prévisualisation du diff.
- **Incompatibilités** : un paramètre supprimé, ou dont le type a changé, alors qu'une instance le surcharge, est signalé et non appliqué silencieusement.
- **Paramètres exposés** : par exemple « titre du hero » → `{ nodePath, prop }`. L'inspecteur d'une instance n'en montre que ces paramètres, avec « Détacher » pour revenir à une copie libre.
- **Absence de cycle** : une définition ne peut pas contenir d'instance d'elle-même, directement ou indirectement. C'est un contrôle de graphe dans `loadSite`.
- **Sections** : une section de la bibliothèque est une définition de symbole hors projet (intégrée au registre, ou enregistrée par l'utilisateur). « Insérer » crée une copie indépendante, sans `instance` (CS-01) ; « insérer liée » crée une instance.
- **Vignettes** : rendu réel réduit dans une iframe, avec les mêmes vues et le même CSS. Aucune image stockée ; la vignette est donc toujours juste et s'adapte aux tokens du site.

**Alternative : références vivantes**. Un nœud `instance` rendu en résolvant la définition au moment du rendu. Pas de duplication, mais :

- le rendu, le canvas, le CSS par nœud, les ids HTML (onglets) et l'export devraient tous gérer l'indirection ;
- la propagation deviendrait implicite, donc non « contrôlée » ;
- les surcharges par instance seraient plus difficiles.

### 4.2 Templates de site (CS-02)

Un modèle est une archive de projet (format `ns.archive` du jalon 2) stockée dans `data/templates/`, ou livrée avec le Studio dans `templates/`.

- **Modèle intégré** : « Atelier Nord », le site de démonstration du jalon 2, avec ses images générées, redistribuables.
- **Enregistrer comme modèle** : depuis un projet.
- **Créer depuis un modèle** : réutilise l'import d'archive, avec ses contrôles.

Les modèles de page actuels (`fixtures/`) restent les modèles minimaux.

### 4.3 Composition avancée (CS-04)

- **Nouvelles propriétés de style typées**, en mode structuré par défaut :
  - `position` (`relative` | `absolute`, absolu seulement à l'intérieur d'un conteneur positionné), `inset` (haut, droite, bas, gauche) ;
  - `zIndex`, `overflow` ;
  - `transform` structuré (translation, rotation, échelle) ;
  - `aspectRatio`, `objectPosition`.
- **Responsive** : toutes ces propriétés sont responsives comme les autres.
- **Garde-fou** : `checkSite` avertit d'un élément absolu qui sort de son conteneur sur un breakpoint.
- **Canvas** :
  - poignées de redimensionnement (largeur/hauteur → `width`/`height`, ou `maxWidth`) ;
  - guides d'alignement pendant le redimensionnement ;
  - barre d'alignement et de distribution pour une sélection dans un conteneur flex ou grid (→ `justify`, `align`, `gap`) ;
  - chaque geste = une transaction.
- **Sélection multiple** [H] : nécessaire pour « distribuer » librement. Elle est limitée aux enfants d'un même parent.

### 4.4 Animations (ADR-0012, accepté)

**Modèle** : `node.animations?: Animation[]`.

```ts
Animation = {
  trigger: 'load' | 'inView' | 'hover' | 'focus' | 'click',
  from: { opacity?, x?, y?, scale?, rotate? },   // état de départ (entrée) ou cible (hover/focus)
  duration, delay, easing: 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | cubic-bezier typé,
  iterations: 1..10 | 'infinite' (load uniquement), direction, stagger? (enfants)
}
```

Le modèle est indépendant de toute bibliothèque (CS-06).

**Runtime [R] : CSS natif + Web Animations API, sans dépendance.**

- **`hover` et `focus`** : CSS pur, avec des transitions générées dans la règle du nœud (`:hover`, `:focus-visible`, `:focus-within`).
- **`load`, `inView`, `click`, `stagger`** : un îlot `animate` (Web Animations API + IntersectionObserver) chargé seulement par les pages qui en ont.
- **Sans JavaScript, ou en mouvement réduit** : le contenu est **visible**. L'état initial masqué n'est jamais appliqué par le CSS seul ; c'est l'îlot qui l'applique juste avant d'animer, ce qui évite un contenu invisible.
- **Mouvement réduit** : `@media (prefers-reduced-motion: reduce)` neutralise les transitions, et l'îlot n'anime rien (CS-12).
- **Motion** n'est ajouté que si un effet ne peut pas être couvert de cette façon. **GSAP** est exclu en l'absence de vérification de licence.

**Éditeur et banc**

- **Prévisualisation** (CS-07) : bouton « Rejouer » sur l'élément, interrupteur « animations » dans le canvas, simulation du mouvement réduit.
- **Isolation de l'éditeur** : les contrôles de l'éditeur ne sont jamais animés par ce runtime, qui ne vit que dans le canvas et le site.
- **Banc** : il compare l'état final, en émulant `reduced-motion`. Un contrôle dédié vérifie, sur le site construit, le déclenchement des animations et leur absence en mouvement réduit.

### 4.5 Services et contrats d'automatisation (ADR-0013, accepté)

**`core/services`** : catalogue généré à partir de `commands`. Pour chaque commande :

- nom, description, JSON Schema des paramètres (`z.toJSONSchema` de zod 4, vérifié sur la version installée) [F] ;
- autorisation requise (`read`, `edit`, `design`, `publish`), effets (nœuds, pages, site), annulable ;
- forme du résultat et codes d'erreur.

**`runBatch(site, calls, ctx)`** : applique un lot sur une copie, s'arrête à la première erreur, valide entièrement et renvoie `{ site, diff, results }`. Le lot est ensuite rejoué dans le store sous **une seule entrée d'historique**.

**Journal** : chaque lot appliqué est consigné (horodatage, origine `user` | `ai`, commandes, résumé), sans texte de contenu si l'origine est l'IA.

**MCP** : les descriptions du catalogue ont la forme d'outils MCP (nom, description, `inputSchema`), mais aucun serveur MCP n'est exposé (CS-10).

### 4.6 Fournisseurs IA (ADR-0014 : Anthropic + compatible OpenAI, validé)

**Où passent les appels** : uniquement par le serveur du Studio (`POST /api/ai`), local au jalon. Les clés sont lues dans l'environnement du serveur (`.env` ignoré par git) et ne sont jamais envoyées au navigateur ni dans l'export (CS-11).

**Interface `AiProvider`** :

```ts
complete({ system, messages, tools, maxTokens }) → { toolCalls | text, usage }
```

- **Implémentations** : une par fournisseur, en `fetch` sans SDK si le protocole est simple.
- **Fournisseur simulé** : déterministe, pour les tests et la démonstration reproductible. Le scénario §5 doit tourner sans réseau ni clé.

**Contexte envoyé, délimité** :

- la sélection ou la section concernée, en JSON ;
- les tokens, la liste des pages et la consigne de l'utilisateur ;
- jamais le site entier par défaut, jamais les médias binaires.

Une politique documentée indique ce qui part chez le fournisseur.

**Garde-fous** :

- limites de jetons par requête et de requêtes par minute ;
- délai d'expiration ;
- erreurs lisibles ;
- interrupteur global (IA désactivée par défaut tant qu'aucune clé n'est configurée) ;
- journal technique : modèle, durée, jetons, statut, jamais le contenu.

### 4.7 Fonctionnalités IA (CS-08, CS-09)

- **Outils proposés au modèle** : un sous-ensemble du catalogue (insérer un arbre, mettre à jour les props ou les styles, déplacer, supprimer, mettre à jour le SEO). Le modèle doit répondre par appels d'outils. Une réponse libre est affichée comme suggestion de texte, sans effet.
- **Rédaction** : titre, reformulation, résumé, ton, SEO. Proposition d'un texte avec un diff avant/après, puis application par `updateNodeProps` ou `updatePage { seo }`.
- **Design** : « ajoute une section de témoignages », « deux colonnes sur tablette », « harmonise les espacements », « variante plus sobre », « applique la palette ». Proposition d'un lot de commandes.
- **Interface de proposition** :
  - aperçu dans le canvas en mode proposition ;
  - diff lisible : nœuds ajoutés, modifiés ou supprimés, et propriétés avant/après ;
  - **Accepter**, une transaction annulable ;
  - **Rejeter**, sans aucune trace dans le document ;
  - journal.
- **Publication** : l'IA ne publie jamais et n'exporte jamais.

### 4.8 Qualité et export (CS-12)

- **Pas de JavaScript exécutable généré** : les îlots restent ceux du registre.
- **Export sans secret** : le banc le vérifie (recherche de motifs de clés dans l'export).
- **Performance** : mesure des pages exportées (poids HTML/CSS/JS, nombre de requêtes). Les seuils sont fixés sur le site démonstrateur, sans garanties chiffrées inventées (CLAUDE §9).

## 5. Interface du Studio

```text
Bibliothèque (gauche)   onglets : Composants · Sections (vignettes, catégories, recherche)
Inspecteur (droite)     + section Animation (ajouter, déclencheur, effet, paramètres, Rejouer)
                        + pour une instance : paramètres, version, « Mettre à jour », « Détacher »
Canvas                  poignées de redimensionnement, guides, barre d'alignement/distribution,
                        interrupteur animations et mouvement réduit
Barre d'outils          + Assistant IA (panneau de droite : consigne, propositions, diff, journal)
Écran Projets           + « Créer depuis un modèle de site », « Enregistrer comme modèle »
```

## 6. Sécurité

- Les réponses de l'IA ne sont que des **données** : elles passent par les schémas de commandes, puis par `loadSite`. Ni HTML ni JavaScript libres, ni URL hors liste blanche (les schémas existants s'appliquent).
- **Injection via le contenu** : un texte du site qui contient des instructions est envoyé comme donnée délimitée, et la réponse reste soumise à validation humaine.
- **Clés et données** : clés côté serveur uniquement, journal sans contenu, IA désactivable, aucune donnée envoyée sans action explicite de l'utilisateur.
- **Modèles de site importés** : mêmes contrôles que les archives (médias vérifiés).

## 7. Dépendances envisagées

| Dépendance | Usage | Décision |
|---|---|---|
| Aucune pour les animations | CSS + Web Animations API | [R], Motion seulement si un besoin réel apparaît |
| SDK d'un fournisseur IA | Appels API | Révisé par l'ADR-0014 : SDK officiel `@anthropic-ai/sdk` côté serveur pour Anthropic, `fetch` pour l'adaptateur compatible OpenAI |
| `zod` (existant) | JSON Schema des commandes | déjà installé |

## 8. Risques

| Id | Risque | Prob. | Impact | Réponse |
|---|---|---|---|---|
| R19 | Fidélité canvas/export avec animations (état temporel) | É | M | Banc en mouvement réduit + contrôle dédié sur le site construit |
| R20 | Contenu invisible si le JS échoue (animations d'entrée) | M | É | État initial appliqué par l'îlot seulement ; test sans JS |
| R21 | Propositions IA invalides ou destructrices | É | M | Lot validé sur copie, diff, acceptation humaine, undo |
| R22 | Fuite de données vers le fournisseur | M | É | Contexte délimité, politique, IA désactivée sans clé, journal sans contenu |
| R23 | Démo non reproductible (IA non déterministe) | É | M | Fournisseur simulé pour la démo et les tests, réel en option |
| R24 | Positionnement absolu qui casse le responsive | M | M | Absolu seulement dans un conteneur positionné, avertissement de `checkSite`, banc |
| R25 | Propagation d'une version qui écrase des surcharges | M | M | Surcharges conservées par paramètre, diff avant mise à jour, incompatibilités signalées |
| R26 | Explosion du périmètre (9 lots) | É | M | Une tranche par lot, chacune démontrable seule |

## 9. Décomposition du jalon 3

| Tranche | Lots | Contenu | Acceptation |
|---|---|---|---|
| **1** | CS-A, CS-B | Symboles (ADR-0011) : définitions, instances développées, paramètres, versions, propagation, détacher ; sections intégrées et enregistrées ; panneau Sections avec vignettes rendues | Une section enregistrée, réutilisée sur 2 pages, modifiée puis propagée ; incompatibilité signalée ; banc |
| **2** | CS-02 | Templates de site : modèle « Atelier Nord », enregistrer comme modèle, créer depuis un modèle | Projet créé depuis le modèle, exporté sans erreur |
| **3** | CS-D, CS-E | Animations (ADR-0012) : modèle, CSS hover/focus, îlot load/inView/click/stagger, reduced motion, inspecteur, Rejouer | Animation d'entrée vérifiée sur le site construit ; aucune en mouvement réduit ; contenu visible sans JS |
| **4** | CS-C | Composition avancée : position, inset, z-index, overflow, transform, aspect-ratio ; poignées, guides, alignement/distribution | Superposition responsive sans défilement horizontal ; gestes = 1 annulation |
| **5** | CS-F | Services (ADR-0013) : catalogue, JSON Schema, autorisations, `runBatch`, diff, journal | Lot appliqué en une transaction, diff exact, refus atomique d'un lot invalide |
| **6** | CS-G | Fournisseurs (ADR-0014) : interface, fournisseur simulé, premier fournisseur réel, proxy serveur, limites, journal, désactivation | Aucune clé côté client ni dans l'export ; IA désactivée sans clé |
| **7** | CS-H | Assistant : rédaction et design, propositions, aperçu, diff, accepter/rejeter, undo | Scénario §5 étapes 7 à 10 en e2e (fournisseur simulé) |
| **8** | CS-I, §5 | `npm run demo:creative`, performances, sécurité de l'export, bilan | Definition of Done §6 |

Ordre : 1 → 2 → 3 → 4 (ces deux lots touchent des fichiers disjoints, ils peuvent avancer en parallèle) → 5 → 6 → 7 → 8.

## 10. Décisions validées (30/10/2026)

1. **Composants réutilisables : instances développées, synchronisées sur demande** (ADR-0011, accepté).
2. **Animations : CSS + Web Animations API, sans dépendance** (ADR-0012, accepté).
3. **Fournisseurs IA : Anthropic (API Messages, appels d'outils) et un adaptateur compatible OpenAI (OpenAI, Mistral, Ollama, LM Studio…)**, sélectionnés par configuration, plus le fournisseur simulé pour les tests et la démonstration. Ce choix sera consigné dans l'ADR-0014, en tranche 6.
4. **Vignettes des sections : rendu réel réduit** (consigné dans l'ADR-0011).
