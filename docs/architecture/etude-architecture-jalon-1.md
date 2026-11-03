# Étude d'architecture — Jalon 1 (Visual Editor)

**Statut :** ADR-0001 à 0005 acceptés le 29/10/2026
**Date :** 29/10/2026
**Sources :** `CLAUDE.md`, `docs/specifications/00` à `03`, `prototypes/render-fidelity/`

Conventions : **[R]** recommandation, **[O]** décision ouverte, **[F]** fait vérifié (prototype
ou outillage local), **[H]** hypothèse à vérifier.

---

## 1. Contrats et invariants retenus des spécifications

| Contrat | Source | Conséquence d'architecture |
|---|---|---|
| Modèle sérialisable, versionné, sans React/DOM | 00 §5, 01 VE-02 | `core` sans dépendance React, imposée par la frontière de package |
| Validation aux frontières, diagnostics explicites, versions futures refusées | 00 §5, VE-02 | `loadDocument()` unique point d'entrée : migration → schéma → sémantique |
| Registre extensible sans modifier l'éditeur | VE-03 | Inspecteur, imbrication et rendu dérivés des définitions |
| Opérations structurées (`insertNode`, `moveNode`…) | 00 §8, CLAUDE §5 | Commandes = seul chemin d'écriture, paramètres validés (réutilisables par l'IA au jalon 3) |
| Slider = 1 transaction ; historique réinitialisé au chargement | VE-09 | Transactions explicites `begin/commit/cancel` |
| Canvas = vrai rendu web, isolé, overlays hors export | 00 §7, VE-07 | iframe + protocole typé ; overlays dans la fenêtre parente |
| Héritage responsive explicite, breakpoints non limités | 00 §6, VE-08 | Breakpoints = données du document ; règle d'héritage unique, testée |
| Export Astro compilable hors dépôt, lockfile, sans runtime NS | VE-11, 00 §3.6 | Gabarit d'export avec lockfile figé ; test de build en répertoire vierge |
| Mesure des écarts aperçu ↔ export | VE-12 | Banc de fidélité automatisé dès la première tranche |
| Pas de HTML/JS arbitraire dans les documents | 00 §9 | Texte riche structuré, styles typés, URLs filtrées |
| Ne pas anticiper les jalons 2-3 | CLAUDE §2 | Contrats ouverts (ex. union de types de liens), aucune implémentation |

Points de tension relevés dans les spécifications :

- VE-07 « idéalement isolé » et VE-05 glisser-déposer : une iframe isolée complique le
  glisser-déposer → traité en §6 et risque R4.
- VE-11 « composants Astro partagés » et 00 §4 « un seul composant, pas deux implémentations » :
  si l'export doit contenir des `.astro` natifs, il faut soit deux implémentations, soit un
  générateur → arbitrage ADR-0002.
- 00 §5 illustre un arbre imbriqué ; il est explicitement non contractuel → ADR-0001 propose
  une table plate.

## 2. Architecture proposée

### 2.1 Vue logique

```text
apps/studio  (Vite + React, une seule application web)
 ├─ shell/        barre, panneaux, sélecteur de viewport, overlays     ── Visual Editor
 ├─ panels/       bibliothèque, arborescence, inspecteur
 ├─ canvas/       2e point d'entrée Vite, chargé dans <iframe>         ── rendu réel
 └─ dev-server/   middleware Vite : persistance fichiers + export      ── adaptateurs
        │ importe
packages/core  (TypeScript pur, aucune dépendance UI)
 ├─ document/     schéma v1, validation, diagnostics, migrations       ── Document Model
 ├─ registry/     contrat ComponentDefinition, createRegistry          ── Component Registry
 ├─ style/        styles typés, héritage responsive, toCss()           ── moteur de styles
 ├─ commands/     insertNode, moveNode, updateNodeProps…               ── Editor Core
 ├─ editor/       EditorStore : état, sélection, transactions, historique
 ├─ protocol/     messages canvas ↔ shell (schémas)
 └─ persistence/  port DocumentRepository
packages/components   définitions (schéma, défauts, inspecteur) + vues React pures
packages/export-astro gabarit + lockfile, generateAstroProject(), CLI
fixtures/             documents de référence (VE-12)
tests/fidelity/       Playwright : canvas vs export construit
```

**[R]** Trois packages et une application. Chaque frontière correspond à une contrainte
vérifiable :

- `core` ne déclare pas React ⇒ le modèle ne peut pas en dépendre ;
- les vues de `components` sont copiées telles quelles dans l'export ⇒ elles ne doivent
  rien importer de l'éditeur ;
- `export-astro` doit tourner sans interface (CLI, tests).

Les sous-dossiers de `core` restent des dossiers : on ne les découpe en packages qu'au
besoin.

**[R]** Les packages sont consommés en sources TypeScript (`exports` → `src/index.ts`) par
Vite et Vitest, sans étape de build intermédiaire.

### 2.2 Flux principaux

1. **Édition.** L'UI appelle `store.dispatch(command)`. La commande est validée puis
   appliquée au document de façon immuable, et une entrée d'historique est ajoutée si aucune
   transaction n'est ouverte. Les abonnés React sont notifiés (`useSyncExternalStore`), puis
   le shell envoie le document et la feuille CSS à l'iframe.
2. **Canvas.** L'iframe rend les **mêmes vues** que l'export (`react-dom/client`) et injecte
   le CSS de `toCss()`. Elle renvoie les rectangles des nœuds et les clics/survols, résolus
   via la classe `ns-<id>`.
3. **Export.** `generateAstroProject(doc, registry)` produit une `Map<chemin, contenu>`
   (fonction pure). Le CLI ou le middleware écrit le dossier, et les tests l'installent et le
   construisent hors dépôt.

### 2.3 État (00 §8)

| État | Emplacement | Persisté | Historique |
|---|---|---|---|
| Document | `EditorStore.doc` (immuable) | oui | oui |
| Sélection, survol | `EditorStore.selection` | non | non [O] |
| Transaction en cours | `EditorStore.tx` | non | 1 entrée au commit |
| Historique | `past/future` d'entrées `{label, command, before, after}` | non | — |
| Persistance | `revision`, `savedRevision`, `saveStatus` | — | — |
| UI temporaire (tailles de panneaux, viewport) | état React local + `localStorage` | préférences | non |

**[R]** Pas de bibliothèque d'état : un store de ~100 lignes dans `core/editor` suffit, et
`useSyncExternalStore` est natif à React.

## 3. Format documentaire minimal (v1)

Détail et alternatives dans l'ADR-0001.

```ts
type PageDocument = {
  schemaVersion: 1;
  kind: 'ns.page';
  id: DocId;
  title: string;
  breakpoints: Breakpoint[];        // [{ id: 'tablet', label, maxWidth: 1023 }, { id: 'mobile', maxWidth: 767 }]
  rootId: NodeId;
  nodes: Record<NodeId, Node>;      // table plate ; la clé est l'id
  assets: Record<AssetId, Asset>;
};

type Node = {
  id: NodeId;                       // /^n[a-z0-9]{8,}$/ : stable, utilisable comme classe CSS
  type: string;                     // clé du registre : 'container', 'heading'…
  name?: string;                    // libellé dans l'arborescence
  props: JsonObject;                // validé par le propsSchema du type
  style: ResponsiveStyle;           // { base?: StyleDecls; [breakpointId]?: StyleDecls }
  children: NodeId[];               // ordonné ; vide pour les feuilles
};

type Asset = { id: AssetId; kind: 'image'; file: string; mime: string; width: number; height: number };
```

Choix structurants :

- **Table plate** `nodes` + `children: NodeId[]` **[R]** :
  - unicité des ids garantie par la structure ;
  - déplacement sans recopie de sous-arbre ;
  - références vérifiables ;
  - parent unique et absence de cycle contrôlés à la validation.

  Le parent n'est pas stocké : il est dérivé à la volée par un index en mémoire.
- **Styles typés, pas de chaînes CSS.** **[R]**
  - Liste blanche de propriétés : espacements, tailles, flex, grid, typographie, couleur,
    fond, bordure, rayon, visibilité.
  - Valeurs structurées : `{ value: 24, unit: 'px' }`, énumérations, couleurs validées.
  - Propriétés de haut niveau quand elles simplifient l'interface et l'IA : `gridColumns: 3`
    produit `repeat(3, minmax(0, 1fr))`.
  - Résultat : aucune injection CSS possible, et l'inspecteur est généré directement.
- **Héritage responsive.** **[R]**
  - Ordre desktop-first : `base` correspond au desktop.
  - Une valeur absente à un breakpoint hérite du breakpoint plus large le plus proche qui la
    définit, sinon de `base`.
  - Le CSS émet `base`, puis des `@media (max-width)` par largeur décroissante : la cascade
    applique exactement cette règle.
  - `resolveStyle(node, bp)` applique la même règle pour l'affichage « hérité de… » dans
    l'inspecteur.

  **[O]** Mobile-first (`min-width`) reste possible : c'est une option de génération, pas de
  modèle.
- **Texte riche limité.** `content: Inline[]`, où
  `Inline = { text; bold?; italic?; link?: Link }`. **[R]**
  - Pas de chaîne HTML.
  - `Link = { kind: 'url'; href }`, schémas `https`, `http`, `mailto`, `tel` et ancres `#`.
  - L'union permettra `{ kind: 'page'; pageId }` au jalon 2 sans migration (ajout compatible).
- **Médias.**
  - Un composant référence `assetId`, jamais une URL.
  - `file` est un chemin relatif au stockage du document, contrôlé par regex.
  - Le SVG est refusé au jalon 1 : son assainissement relève du jalon 2 (SB-06).
- **Tokens.** Pas de champ `design` au jalon 1 **[R]** (YAGNI). Ajouter plus tard une valeur
  `{ token: 'color.primary' }` dans l'union des valeurs de style est rétrocompatible.

**Évolution vers le jalon 2 [R].** Un futur `SiteDocument` contiendra des pages dont la forme
reprendra `PageDocument`, sans `schemaVersion` propre. Il faudra une migration de
`ns.page` v1 vers `ns.site` v2, dont la faisabilité est triviale [H].

## 4. Registre de composants

```ts
interface ComponentDefinition<P extends JsonObject> {
  type: string;                         // 'heading'
  version: 1;                           // migrations de props par composant
  label: string; category: 'layout' | 'content' | 'media';
  props: ZodType<P>;                    // source unique : validation + types + JSON Schema
  defaults: { props: P; style?: ResponsiveStyle };
  children: { accepts: 'none' | 'any' | readonly string[]; max?: number };
  style: readonly StyleGroup[];         // groupes de styles exposés : 'spacing', 'flex', 'typography'…
  inspector: readonly InspectorGroup[]; // Content | Layout | Style | Advanced → champs et contrôles
  viewName: string;                     // vue pure dans components/src/<type>/view.tsx (révisé en tranche 1)
  presets?: readonly Preset[];          // ex. « Section », « Rangée 2 colonnes » (VE-04)
}
```

- `createRegistry(defs)` refuse les doublons et expose `get`, `canContain(parentType,
  childType)` et `list(category)`. Ajouter un composant n'exige que sa définition, sans
  modifier `core` ni le shell (VE-03).
- **Vues pures** **[R]** : aucun hook d'état ou d'effet, aucune API navigateur, rendu
  déterministe à partir des props. Une règle Biome `noRestrictedImports` le fait respecter,
  et le banc de fidélité le vérifie. C'est la condition de l'identité SSR = CSR.
- Les styles communs (espacements, fond, visibilité) sont des groupes partagés que les
  définitions référencent, ce qui les mutualise (VE-06).
- Section, Rangée et Colonne Tatsu deviennent des `presets` de `container`, `stack` et
  `grid`, et non des types (VE-04, CLAUDE §7).
- **[O]** `ViewProps` contient `className` (la classe `ns-<id>`) et `props`. Le canvas
  identifie les nœuds par cette classe, présente aussi dans l'export, pour garder des DOM
  identiques ; un `data-ns-id` ne servirait qu'au canvas.

## 5. Stratégies de fidélité aperçu ↔ export

| | **S1 Vues React partagées** | **S2 IR HTML neutre + 2 sérialiseurs** | **S3 Composants `.astro`, aperçu rendu par Astro** | **S4 Canvas = serveur dev Astro de l'export** |
|---|---|---|---|---|
| Principe | Mêmes `.tsx` : `react-dom/client` dans l'iframe, Astro + `@astrojs/react` (SSR sans `client:`) à l'export | `render(props) → HNode` ; l'adaptateur React rend le canvas, un sérialiseur produit `.astro` ou HTML | Composants écrits en `.astro` ; le canvas reçoit du HTML rendu côté serveur (Container API) | Chaque édition écrit les fichiers ; l'iframe affiche `astro dev` avec HMR |
| Implémentations par composant | 1 | 1 (en `h()`, moins lisible) | 1 | 1 |
| Fidélité | Même code, même CSS ; **mesurée identique [F]** | Bonne ; risque d'écart entre sérialiseurs (échappement, booléens) | Très bonne | Maximale |
| Latence d'édition | Rendu React incrémental local | Locale | Aller-retour serveur à chaque frappe, puis morphing DOM | Écriture disque + HMR (centaines de ms [H]) |
| Export | Astro + composants `.tsx` ; React au **build seulement**, 0 JS livré **[F]** | Astro « pur », sans React | Astro idiomatique | Idem S3 |
| Coût | Faible | Moyen (DSL, 2 sérialiseurs) | Élevé (service de rendu, synchronisation DOM, sélection sur HTML serveur) | Élevé, couple l'éditeur au système de fichiers |
| Maturité | API stables | Code maison | Container API à vérifier pour Astro 7 [H] | Stable, mais lourd |

**[R] S1 au jalon 1**, avec deux compléments :

1. Un **banc de fidélité** qui construit l'export réel et le compare au canvas, à mêmes
   viewport, navigateur, polices et données. Il compare le DOM normalisé, les styles
   calculés, les boîtes et les pixels, et constitue l'« aperçu de vérification » de VE-12.
2. Une **page exportée en JSX explicite** :
   - forme générée : `<Heading className="ns-n1a2" level={1} content={[…]} />` ;
   - toutes les valeurs passent par `JSON.stringify` dans des expressions `{…}`, ce qui
     règle l'échappement ;
   - un développeur Astro lit et modifie la page sans connaître NS (SB-12).

   Repli **[O]** : `<Page doc={json} />`, la forme testée par le prototype.

**Résultat du prototype [F]** (`prototypes/render-fidelity/README.md`) :

- À 1280, 1024, 768 et 375 px, le DOM normalisé est identique, aucun des 18 éléments n'a de
  style calculé ou de boîte différent, et les captures pleine page sont identiques au pixel.
- L'export ne contient aucun `<script>`.
- `npm ci` puis `astro build` réussissent dans une copie hors dépôt.
- Écart relevé : React client place `src` en dernier sur `<img>`. La comparaison du DOM doit
  donc normaliser l'ordre des attributs.

**Compromis acceptés avec S1.**

- L'export contient `react`, `react-dom` et `@astrojs/react` en dépendances de build. Ces
  dépendances publiques ne constituent pas un runtime NS, et aucun JavaScript n'est livré.
- Les composants exportés sont en `.tsx` plutôt qu'en `.astro`. Le pattern est documenté par
  Astro (framework components).

Si un export « 100 % .astro » devient une exigence, S2 reste ouvert : le modèle documentaire
ne dépend pas de ce choix.

**Pourquoi S1 maintient la fidélité, et ses limites.**

- La fidélité repose sur trois conditions :
  - des vues pures ;
  - une feuille CSS unique ;
  - un viewport du canvas égal à la largeur choisie : l'iframe a cette largeur, donc les
    **vraies** media queries s'appliquent, contrairement au calcul JS par appareil de Tatsu.
- Les écarts possibles viennent du contexte : styles de l'éditeur fuyant dans l'iframe,
  polices non chargées, différences d'ordre d'attributs. Le banc les mesure.

## 6. Canvas et protocole

- **Isolation.** L'iframe `canvas.html` (2e entrée Vite) ne contient que les vues, le CSS
  généré et un petit runtime de messages.
  - **[R]** `sandbox="allow-scripts"` (origine opaque) : le contenu ne peut pas lire le shell.
  - **[H]** À vérifier : le serveur dev Vite doit servir les modules à l'origine `null`
    (CORS). Repli **[O]** : iframe même origine sans sandbox, la validation documentaire
    restant la protection principale.
- **Protocole** (`core/protocol`). Messages discriminés par `type`, validés par Zod des deux
  côtés, avec rejet et journalisation des messages inconnus.
  - Shell → canvas : `render { doc, css }`. Le document complet est envoyé : simple, suffisant
    pour une page **[H]** à mesurer. Évolution prévue vers des patchs.
  - Canvas → shell : `ready`, `layout { rects, scroll }` (via ResizeObserver et scroll),
    `pointer { kind: 'click' | 'hover', nodeId }`.
- **Overlays.** Sélection, survol, poignées et cibles de dépôt sont dessinés **dans le
  shell**, superposés à l'iframe à partir des `rects`. Le DOM du canvas reste strictement
  celui de l'export (VE-07).
- **Glisser-déposer.**
  - Pendant un glissement, une couche transparente du shell capte le pointeur au-dessus de
    l'iframe.
  - La cible `(parentId, index)` est calculée par une fonction pure
    `computeDropTarget(rects, doc, registry, point)`. Elle est testable sans navigateur et
    refuse les destinations interdites avant toute modification (VE-05).
  - **[R]** Aucune bibliothèque de glisser-déposer au départ. L'arborescence utilise la même
    logique, avec des équivalents clavier : couper/coller, monter/descendre.
- **Inline editing.** Hors première tranche ; le texte est édité dans l'inspecteur **[O]**.

## 7. Commandes, transactions, historique

Voir l'ADR-0003.

- Une commande est une fonction pure `(doc, params, ctx) → { ok: true, doc } | { ok: false,
  error }`. Ses `params` sont décrits par un schéma Zod (réutilisable comme schéma d'outil IA
  ou MCP au jalon 3).
- Commandes du jalon 1 : `insertNode`, `insertPreset`, `moveNode`, `removeNode`,
  `duplicateNode`, `pasteNodes`, `updateNodeProps`, `updateNodeStyle(id, breakpoint,
  patch)`, `renameNode`.
- **Historique par instantanés** **[R]** : entrée `{ label, command, before, after }`.
  - Le partage structurel rend la mémoire négligeable pour une page.
  - Undo et redo restaurent un instantané : c'est correct par construction, sans commande
    inverse à écrire ni à tester.
- **Transactions.** `begin(label)`, puis des `dispatch` en aperçu (sans historique), puis
  `commit()` qui ajoute une seule entrée, ou `cancel()`.
  - Un slider fait `pointerdown → begin` et `pointerup → commit`.
  - Une saisie texte valide sa transaction après 500 ms d'inactivité ou au blur.
- `load()` réinitialise l'historique. `dirty` vaut `revision !== savedRevision`.

## 8. Persistance et export

Persistance : voir l'ADR-0004.

- Port `DocumentRepository { list(); load(id); save(doc, expectedRevision) }`.
- **Adaptateur de développement** : middleware Vite (`configureServer` et
  `configurePreviewServer`).
  - Il écrit `data/documents/<id>.json` atomiquement (fichier temporaire puis `rename`).
  - Les ids sont filtrés par regex, et aucun chemin construit à partir d'une saisie n'est
    accepté.
  - Le serveur écoute uniquement sur `127.0.0.1`.
- **Fichiers** : import et export JSON via téléchargement et `<input type=file>`, avec
  validation complète.
- **Échec de sauvegarde** : bannière persistante, document toujours marqué modifié, nouvel
  essai, et garde `beforeunload`. Rien n'est perdu silencieusement (VE-10).
- **[O]** Brouillon local IndexedDB contre la perte d'onglet : utile, non indispensable au
  jalon 1.

Export : voir VE-11 et l'ADR-0002.

- `packages/export-astro/template/` contient `package.json` en versions exactes, le
  **`package-lock.json` commité** et `astro.config.mjs`.
- Le générateur ajoute :
  - `src/pages/index.astro` ;
  - `src/components/*.tsx`, copiés uniquement s'ils sont utilisés ;
  - `src/styles/page.css`, produit par `toCss` ;
  - `public/assets/*` ;
  - un `README.md` (Node requis, `npm ci`, `npm run build`, déploiement de `dist/`).
- Un script `npm run template:update` régénère le lockfile ; ce script est testé.
- **[F]** Le lockfile npm contient les binaires natifs des autres plateformes, et
  `--omit=optional` casse le build.

## 9. Sécurité (jalon 1)

| Menace | Mesure |
|---|---|
| HTML ou script dans un document | Texte riche structuré, aucune prop HTML, vues sans `dangerouslySetInnerHTML` (règle de lint) |
| Injection CSS | Styles typés en liste blanche ; `toCss` ne concatène que des valeurs validées |
| URLs `javascript:` | `Link` filtré par schéma, au chargement et dans l'inspecteur |
| Injection dans l'export | Valeurs émises via `JSON.stringify` dans des expressions Astro ; chemins générés, jamais fournis |
| Traversée de chemins (stockage, assets) | Ids filtrés par regex, pas de `join` sur une saisie, vérification que le chemin résolu reste dans la racine |
| Fichiers importés | JSON validé ; images vérifiées par signature (PNG, JPEG, WebP, AVIF) ; SVG refusé au jalon 1 ; taille max |
| Accès au Studio | Écoute locale uniquement ; pas d'authentification maison (CLAUDE §8) |
| Contenu du canvas | iframe sandbox (cf. §6) |
| Dépendances | Liste courte et justifiée (§10), versions exactes, `npm audit` dans `check` |

## 10. Dépendances proposées

| Dépendance | Rôle | Justification | Alternative écartée |
|---|---|---|---|
| `react`, `react-dom` 19 | UI et vues partagées | Imposé par les specs ; sert aussi au rendu exporté | — |
| `zod` 4 | Schémas document, props, commandes, protocole | Validation runtime + types + `toJSONSchema` (futur IA/MCP) [H] | Valibot (plus léger, écosystème plus petit), TypeBox |
| `vite` | Dev/build du Studio, 2 entrées | Standard, sert aussi les middlewares de dev | — |
| `vitest` | Tests unitaires | Partage la config Vite | — |
| `@playwright/test` | E2E et fidélité | Déjà validé par le prototype [F] | — |
| `@biomejs/biome` | Lint et format | Un seul outil, sans plugins | ESLint + Prettier (plus de dépendances) |
| `astro`, `@astrojs/react` | **Gabarit d'export uniquement**, et tests | Cible imposée | — |
| `typescript` | Typecheck | Imposé | Version : 7.0.2 publiée, outillage à vérifier ; repli 5.x/6.x **[H]** |

Exclues au jalon 1, à réévaluer seulement sur un besoin mesuré :

- une bibliothèque d'état ;
- une bibliothèque de glisser-déposer ;
- un éditeur riche (Tiptap, Lexical) ;
- un kit d'UI ou du CSS-in-JS ;
- Immer : à envisager si les mises à jour immuables deviennent pénibles.

**[F]** Versions relevées sur npm le 29/10/2026 :

| Paquet | Version |
|---|---|
| astro | 7.4.4 |
| @astrojs/react | 7.1.2 |
| react | 19.3.1 |
| zod | 4.6.7 |
| vite | 8.3.5 |
| vitest | 5.0.5 |
| @playwright/test | 1.64.1 |
| @biomejs/biome | 2.6.4 |
| typescript | 7.0.2 |

**[F]** pnpm est installé localement mais en erreur au lancement : d'où la recommandation de
npm workspaces (ADR-0005).

## 11. Risques

| # | Risque | Prob. | Impact | Mitigation |
|---|---|---|---|---|
| R1 | Contexte du canvas différent de l'export (CSS de l'éditeur, polices, barre de défilement) | M | É | iframe sans CSS d'éditeur ; polices locales identiques ; banc de fidélité en CI |
| R2 | Une vue non pure (hook, `Date`, `Math.random`) casse l'égalité SSR = CSR | M | É | Règle de lint + fidélité sur toutes les fixtures |
| R3 | Iframe sandbox incompatible avec le serveur Vite (CORS `null`) | M | M | Vérifier dès la tranche 2 ; repli même origine |
| R4 | Glisser-déposer au-dessus d'une iframe : précision, défilement automatique, accessibilité | É | M | Couche de capture + `computeDropTarget` pur et testé ; équivalents clavier |
| R5 | Export non reproductible (lockfile, binaires natifs, version Node) | M | É | Lockfile commité, `engines`, test de build vierge en CI, `npm ci` documenté |
| R6 | Instabilité des versions récentes (Astro 7, Vite 8, TS 7) | M | M | Versions exactes ; mise à jour par script, validée par le banc |
| R7 | Table plate moins lisible par un humain ou une IA | F | F | Vues `toTree()` pour diagnostic et prompts ; décision ouverte ADR-0001 |
| R8 | Classes `ns-<id>` peu lisibles dans l'export | É | F | Acceptable au jalon 1 ; noms sémantiques plus tard |
| R9 | Coût de l'envoi complet du document à chaque modification | F | M | Mesurer sur 500 nœuds ; passage à des patchs si besoin |
| R10 | Dérive du texte riche (listes, titres inline, collages) | M | M | Marques limitées : gras, italique, lien ; collage en texte brut |
| R11 | Comparaison pixel instable entre OS ou navigateurs | M | F | Pixels comparés dans le même navigateur ; DOM et styles calculés comme critères principaux |

## 12. Décomposition du jalon 1

« Fichiers possédés » : périmètre exclusif de la tâche, pour paralléliser sans conflit.

| ID | Tâche (lot) | Dépend de | Fichiers possédés | Livrable | Critères d'acceptation |
|---|---|---|---|---|---|
| T01 | Initialisation (VE-A) | ADR validés | racine : `package.json`, `tsconfig.base.json`, `biome.json`, `vitest.workspace.ts`, squelettes des workspaces | Dépôt exécutable | `npm run check` (typecheck + lint + test) vert ; `npm run dev` ouvre une page vide |
| T02 | Schéma document v1 (VE-B) | T01 | `core/src/document/**` | `loadDocument`, `serialize`, diagnostics | Aller-retour sans perte ; type inconnu, id dupliqué, orphelin, cycle, double parent et version future → diagnostics codés et testés |
| T03 | Contrat du registre (VE-C) | T02 (types) | `core/src/registry/**` | `ComponentDefinition`, `createRegistry`, `canContain` | Un composant de test s'enregistre sans modifier `core` ; doublon refusé ; imbrication testée |
| T04 | Styles et moteur CSS (VE-C) | T02 | `core/src/style/**` | `StyleDecls`, `resolveStyle`, `toCss` | Héritage desktop-first testé sur 3 breakpoints et un breakpoint ajouté ; valeur invalide refusée ; CSS déterministe |
| T05 | Commandes, store, historique (VE-B, VE-E) | T02, T03 | `core/src/commands/**`, `core/src/editor/**` | `EditorStore`, 9 commandes | Ids conservés au déplacement ; cycle refusé ; duplication = nouveaux ids ; transaction = 1 entrée ; reset au chargement ; `dirty` correct |
| T06 | Composants fondamentaux (VE-04) | T03, T04 | `components/src/<type>/**`, un dossier par composant | 8 définitions + vues + presets | Schéma, défauts, inspecteur ; snapshot SSR ; `alt` obligatoire sauf image décorative ; niveau de titre sémantique |
| T07 | Générateur d'export Astro (VE-F) | T04, T06 (≥ 2 composants) | `export-astro/**` | gabarit + lockfile, `generateAstroProject`, CLI `ns-export` | Copie dans un dossier temporaire, `npm ci` et `build` OK ; 0 `<script>` ; assets copiés ; README ; caractères spéciaux échappés |
| T08 | Banc de fidélité (VE-12) | T07, T09 | `tests/fidelity/**`, `fixtures/**` | Généralisation du prototype | 7 fixtures VE-12 × 4 largeurs ; rapport des écarts ; échec CI si régression |
| T09 | Runtime canvas et protocole (VE-07) | T04, T06 | `core/src/protocol/**`, `studio/src/canvas/**` | iframe + messages | Messages validés des deux côtés ; clic → `pointer` ; `layout` après rendu et redimensionnement |
| T10 | Shell de l'éditeur (VE-01, VE-D) | T05, T09 | `studio/src/shell/**` | Panneaux redimensionnables, barre, viewports, overlays | Sélection synchronisée canvas et arbre ; viewport desktop, tablette, mobile et personnalisé ; aperçu sans contrôles |
| T11 | Arborescence | T10 | `studio/src/panels/tree/**` | Arbre, réordonnancement | Sélection synchronisée ; déplacement souris et clavier ; destinations interdites signalées |
| T12 | Inspecteur (VE-06, VE-08) | T10 | `studio/src/panels/inspector/**`, un fichier par contrôle | Inspecteur généré | 11 contrôles ; groupes Content, Layout, Style, Advanced ; édition par breakpoint avec indication d'héritage ; slider = 1 undo ; saisie invalide sans effet sur le document |
| T13 | Bibliothèque et glisser-déposer dans le canvas (VE-05) | T09, T10 | `studio/src/panels/library/**`, `studio/src/dnd/**` | Insertion et déplacement | `computeDropTarget` testé ; refus avant modification ; ids conservés |
| T14 | Presse-papiers et raccourcis | T05, T10 | `studio/src/shortcuts/**` | Copier, coller, dupliquer, supprimer, undo, redo | Collage avec nouveaux ids, refusé dans un conteneur incompatible ; raccourcis documentés |
| T15 | Persistance (VE-10) | T02, T10 | `core/src/persistence/**`, `studio/dev-server/documents.ts`, `studio/src/persistence/**` | Port, middleware, import/export JSON | Écriture atomique ; échec visible et document conservé ; JSON invalide refusé avec diagnostics ; test de traversée de chemin |
| T16 | Médias minimaux | T15, T07 | `studio/dev-server/assets.ts`, `studio/src/assets/**` | Upload d'image et références | Signature vérifiée ; SVG refusé ; asset copié à l'export |
| T17 | Export depuis l'UI | T07, T15 | `studio/dev-server/export.ts`, bouton d'export | Dossier `exports/<id>/` | Export identique à celui du CLI |
| T18 | Démonstration et limites (§6 des specs) | tout | `fixtures/demo-*.json`, `e2e/demo.spec.ts`, `docs/limitations.md` | Scénario de bout en bout | Hero, texte, bouton, image, grille de 3 cartes et mobile ; édition, sauvegarde, rechargement, export, build hors dépôt, fidélité mesurée |

## 13. Parallélisation sans conflit

**Règle :** un contrat partagé a un seul propriétaire, et il est gelé (fusionné) avant que ses
consommateurs démarrent. Les contrats à geler sont :

- `core/src/document/types.ts` ;
- `core/src/registry/types.ts` ;
- `core/src/style/types.ts` ;
- `core/src/protocol/messages.ts`.

| Vague | Agents en parallèle | Condition d'entrée |
|---|---|---|
| 0 | 1 agent : T01, puis les **types** de T02, T03 et T04 | ADR validés |
| 1 | A : T02 (validation) · B : T04 (moteur CSS) · C : T05 (commandes et store) | Types gelés |
| 2 | D1…Dn : T06, un composant par agent · E : T07 · F : T09 · G : T15 (côté core et serveur) | T03 et T04 fusionnés ; `messages.ts` gelé par F avant tout consommateur |
| 3 | H : T10, puis en parallèle I : T11 · J : T12 · K : T13 · L : T14 · M : T08 · N : T16, T17 | T10 doit exposer la surface d'overlay et la mise en page des panneaux avant I à L |
| 4 | 1 intégrateur : T18 | Tout fusionné |

Fichiers à point de contention unique, confiés à un intégrateur et à modifier par ajout d'une
ligne seulement :

- `components/src/index.ts` (liste du registre) ;
- `studio/vite.config.ts` (middlewares) ;
- `package.json` racine.

## 14. Première tranche d'implémentation proposée

**Objectif :** dérisquer l'ADR-0002 dans le vrai dépôt avant tout travail d'interface, comme
le demande CLAUDE §6.

**Tranche 1 — « JSON → canvas et export, fidélité mesurée en CI ».**

1. T01 : initialisation npm workspaces, TS strict, Biome, Vitest, `npm run check`.
2. T02 minimal : schéma v1, `loadDocument`, diagnostics principaux.
3. T04 : styles typés (espacements, flex, grid, typographie, couleur, fond, rayon), héritage
   responsive, `toCss`.
4. T03 + T06 restreint : contrat du registre et 4 composants (`container`, `stack`, `grid`,
   `heading`), puis `text` en texte simple.
5. T09 minimal : page canvas qui rend un document reçu par `postMessage`, sans shell.
6. T07 minimal : gabarit, lockfile et générateur JSX explicite.
7. T08 : banc de fidélité sur 3 fixtures (typographie, flex, grid responsive) à 4 largeurs, plus
   le build en répertoire vierge.

**Acceptation de la tranche :**

- `npm run check` et `npm run test:fidelity` sont verts.
- L'export d'une fixture se construit hors dépôt et ne contient aucun `<script>`.
- Les écarts sont documentés.
- Le statut de l'ADR-0002 passe à « Accepté », ou bien la stratégie est révisée.

**Hors tranche :** shell, store et commandes (tranche 2), persistance, médias, glisser-déposer.

**Prérequis (réglés le 29/10/2026) :**

- ADR-0001 à ADR-0005 acceptés.
- Dépôt git initialisé, privé ; licence non choisie (MIT ou Apache-2.0 envisagées).
- `resources/` (copie Tatsu/Oshin) exclu du dépôt via `.gitignore`.
