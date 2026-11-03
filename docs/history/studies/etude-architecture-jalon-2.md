# Étude d'architecture — Jalon 2 (Site Builder)

**Statut :** ADR-0007 et ADR-0008 acceptés le 30/10/2026
**Date :** 30/10/2026
**Sources :** `CLAUDE.md`, `docs/specifications/00`, `02`, `docs/history/reports/tranche-5.md`, `docs/limitations.md`, code du jalon 1

Conventions : **[R]** recommandation, **[O]** décision ouverte, **[F]** fait vérifié dans le dépôt,
**[H]** hypothèse à vérifier.

---

## 1. Point de départ

Le jalon 1 livre un éditeur d'**une page** (`ns.page` v1) : table plate de nœuds, registre,
styles typés desktop-first, commandes et historique, canvas iframe partageant les vues React avec
l'export Astro, persistance de développement (ETag, écriture atomique), banc de fidélité.

Contrats prévus pour le jalon 2, rien d'implémenté (`tranche-5.md`) [F] :

| Contrat | État actuel | Évolution |
|---|---|---|
| Enveloppe | `{ schemaVersion: 1, kind: 'ns.page', breakpoints, rootId, nodes, assets }` | `ns.site` v2, première migration |
| Liens | union `{ kind: 'url' }` | ajout de `{ kind: 'page', pageId }` |
| Styles | valeurs littérales | ajout d'une valeur `{ token }` |
| Médias | `data/media/` commun, images raster seules | isolés par projet, SVG et fichiers |
| Persistance | `data/documents/<id>.json` | projets |
| `loadDocument` | refuse toute version ≠ 1 | migrations séquentielles pures |

## 2. Contrats retenus de la spécification 02

| Contrat | Source | Conséquence d'architecture |
|---|---|---|
| Projets isolés, ressources comprises ; comptes futurs possibles | SB-01 | Un dossier par projet ; aucun chemin partagé entre projets ; l'id de projet est la clé de l'adaptateur |
| URLs indépendantes des libellés ; pages ≠ menus | SB-02, SB-03 | `slug` distinct de `title` ; menus = données séparées, sans hiérarchie d'URL |
| Liens internes par référence | SB-03 | `{ kind: 'page', pageId }` résolu au rendu ; un changement de slug ne casse rien |
| Header/footer partagés, plusieurs variantes possibles | SB-04 | Compositions de site (« layouts ») référencées par les pages |
| Tokens référencés, valeurs libres conservées | SB-05 | Union `littéral | { token }` dans chaque propriété de style concernée |
| Médias par id stable, SVG sûrs, originaux préservés | SB-06 | Politique SVG explicite ; variantes dérivées, jamais à la place de l'original |
| JS uniquement si nécessaire, dégradation documentée | SB-07, §3 | HTML natif d'abord (`<details>`), îlots JS minimaux ensuite |
| Prévisualisation sans outils d'édition | SB-09 | Rendu de site complet, navigable par vrais liens |
| Sources + build statique, sans service NS | SB-10 | Deux livrables du même export |
| Erreurs bloquantes et avertissements | SB-11 | `checkSite()` pur, partagé par l'UI et l'export |
| Format source exportable et réimportable | SB-12 | Archive = `site.json` + médias, passant par `loadSite` |

Points de tension :

- **SB-05 « variantes responsive » des tokens** et **héritage desktop-first** : un token peut varier
  par breakpoint ; il faut une seule règle d'héritage pour les nœuds et pour les tokens (§4.3).
- **SB-06 optimisation des images** et **fidélité (ADR-0002)** : si l'export produit un `srcset`
  que le canvas n'a pas, le DOM diverge. Les variantes doivent exister des deux côtés (§4.5).
- **SB-07 onglets** : impossibles sans JS de façon accessible ; il faut une dégradation documentée
  (§4.6).
- **SB-08 redirections** : un site statique ne peut pas imposer de redirection HTTP ; l'export
  fournit des fichiers de configuration documentés, pas une garantie.

## 3. Architecture proposée

### 3.1 Vue logique

```text
apps/studio
  shell/        écran Projets, éditeur (pages, arbre, inspecteur, design system, médias, menus)
  canvas/       rendu d'une page du site (header + page + footer), inchangé dans son principe
  dev-server/   adaptateur projets, médias, aperçu du site, export
packages/core
  document/     schéma ns.site v2, migrations, loadSite, checkSite (dossier conservé, contenu remplacé)
  registry/     contrat inchangé ; resolve() reçoit un contexte de rendu
  style/        styles typés + tokens, toCss(site, roots)
  editor/       commandes de nœuds + commandes de site, store, historique
  protocol/     messages shell ↔ canvas (render porte la page courante)
packages/components   + nav, link-list, gallery, video, icon, accordion, tabs, form
packages/export-astro génération multipage, SEO, build statique
```

Pas de nouveau package, ni de nouveau dossier : `core/document/` porte le modèle de site (ADR-0005
envisageait un `site-model` séparé « si `core` devient trop large » ; ce n'est pas le cas,
~1 500 lignes) [R].

### 3.2 Flux principaux

```text
Ouvrir un projet : GET /api/projects/:id → loadSite (migration → schéma → sémantique) → store
Éditer           : commande → store (historique) → postMessage render(site, pageId) → canvas
Enregistrer      : PUT /api/projects/:id (If-Match) → loadSite côté serveur → écriture atomique
Aperçu           : GET /preview/:projectId/<slug> → rendu serveur des mêmes vues → page HTML
Exporter         : checkSite → génération Astro → (option) npm ci + build → dist/
```

## 4. Décisions

### 4.1 Modèle de site v2 (ADR-0007)

[R] **Un seul document `ns.site` par projet, avec une table de nœuds globale.**

```ts
{
  schemaVersion: 2,
  kind: 'ns.site',
  id, name,
  settings: { lang: 'fr', baseUrl: 'https://exemple.fr' | null, homePageId, defaultLayouts: { header, footer } },
  breakpoints: Breakpoint[],              // inchangé, remonté au niveau du site
  tokens: Tokens,                         // §4.3
  assets: Record<AssetId, Asset>,         // remonté au niveau du site, §4.5
  nodes: Record<NodeId, Node>,            // TOUS les nœuds : pages et layouts
  pages: Page[],                          // ordre = ordre d'affichage dans le Studio
  layouts: Layout[],                      // header, footer (variantes possibles)
  menus: Menu[],
  redirects: Redirect[],
}
Page   = { id, title, slug, rootId, publish: boolean, layouts?: { header?: LayoutId | null, footer?: … }, seo: Seo }
Layout = { id, name, role: 'header' | 'footer', rootId }
Menu   = { id, name, items: MenuItem[] }                 // profondeur ≤ 2 validée
MenuItem = { id, label: string | null, link: Link, children: MenuItem[] }
```

Pourquoi une table globale : les commandes du jalon 1 (`insertNode`, `moveNode`…) opèrent sur
`nodes` par id et restent inchangées ; le copier-coller entre pages et layouts est gratuit ; les
classes `ns-<id>` restent uniques sur tout le site, donc une feuille de styles commune est sûre.
La validation devient « chaque nœud est atteint exactement une fois depuis une racine (page ou
layout) ».

Pourquoi un seul fichier : un seul ETag, une seule validation, un historique cohérent (un token
modifié touche toutes les pages), une sauvegarde atomique et une archive triviale (SB-12). Un site
vitrine de 5 à 20 pages pèse quelques centaines de Ko.
Plafond connu : au-delà de quelques Mo, ou avec de l'édition concurrente, découper par page derrière
le même port de persistance (ADR-0008).

Migration **v1 → v2** (fonction pure, testée) : la page v1 devient la page d'accueil d'un site
d'une page (`slug: ''`, `publish: true`), ses `breakpoints` et `assets` remontent au site, aucun
layout, aucun menu, tokens vides. Les fixtures v1 et le banc de fidélité passent par cette
migration sans être réécrits.

Slugs : `^[a-z0-9]+(?:-[a-z0-9]+)*(?:/[a-z0-9]+(?:-[a-z0-9]+)*)*$`, la page d'accueil a le slug
vide. Unicité, segments réservés (`404`, `media`, `_astro`) et collisions avec les redirections
contrôlés par la validation sémantique.

### 4.2 Liens, navigation et layouts

- `linkSchema` devient l'union `{ kind: 'url', href } | { kind: 'page', pageId, anchor? }`.
  Rétrocompatible : aucune migration de données [F, prévu au jalon 1].
- `ComponentDefinition.resolve(props, ctx)` reçoit `ctx = { site, pageId }` au lieu du seul
  document : c'est là que `pageId` devient une URL relative, qu'un menu devient une liste d'entrées
  avec `current` (`aria-current="page"`), et que les tokens ou médias sont résolus. Même fonction
  pour le canvas, l'aperçu et l'export, donc même DOM.
- **Changement de slug** : les liens suivent automatiquement (référence par id). L'inspecteur de
  page liste les nœuds et menus qui pointent vers la page et propose d'ajouter une redirection
  depuis l'ancien slug (SB-02).
- **Composant `nav`** : prop `menuId`, rend `<nav><ul>` sémantique. Mobile : bouton de menu
  basé sur `<details>/<summary>`, fonctionnel sans JS ; sous-menus sur un niveau [R]. Le
  comportement exact (fermeture au clic extérieur, Échap) relève d'un éventuel îlot JS (§4.6).
- **Layouts** : une page affiche `header + page + footer`, chaque layout pris dans la page ou dans
  `settings.defaultLayouts`, `null` = aucun. Le canvas rend les trois racines ; les nœuds d'un
  layout sont verrouillés pendant l'édition d'une page (survol grisé, clic = « Modifier le
  header »), et s'éditent en ouvrant le layout depuis le panneau Pages. L'interface du jalon se
  limite à un header et un footer principaux, le modèle accepte des variantes.

### 4.3 Design tokens (ADR-0009)

```ts
Tokens = {
  colors:  Record<TokenId, { label, value: Color }>,
  fonts:   Record<TokenId, { label, stack: string[] }>,          // familles, liste blanche de caractères
  spacing: Record<TokenId, { label, value: ResponsiveValue<Length> }>,
  radii, shadows, widths: Record<TokenId, …>,
  text:    Record<TokenId, TextStyle>,                           // styles de texte : h1…h6, body, small…
}
ResponsiveValue<T> = { base: T, [breakpointId]?: T }             // même héritage que les nœuds
```

- Valeur de style : `littéral | { token: TokenId }`, uniquement pour les propriétés concernées
  (couleurs, longueurs, rayons). Rétrocompatible.
- CSS : `:root { --ns-color-primary: … }` puis, par breakpoint, une redéfinition dans la même
  `@media (max-width)` que les nœuds. Une référence produit `var(--ns-color-primary)`. Une
  modification de token = une variable modifiée, donc répercussion immédiate sans réécrire les
  nœuds (SB-05).
- **Styles de texte** : propriété `textStyle` sur heading et text, qui applique la classe
  `ns-text-<id>` générée à partir du token ; les propriétés locales restent prioritaires (ordre
  de la cascade). Les défauts d'`h1…h6` et du corps de texte sont des styles de texte du site.
- **Polices** : piles système ou fichiers de police importés dans la médiathèque (`@font-face`
  servi localement) ; aucun appel à un service tiers (Google Fonts) dans l'export [R].
- Suppression d'un token référencé : refusée avec la liste des références, ou remplacement
  explicite par une valeur.
- Commandes : `setToken`, `removeToken`, `renameToken` (renommer le libellé, l'id ne change pas).

### 4.4 Persistance par projet (ADR-0008)

```text
data/projects/<projectId>/site.json        source de vérité (écriture atomique, ETag)
data/projects/<projectId>/media/<file>     originaux importés
data/projects/<projectId>/media/.derived/  variantes optimisées (reconstructibles)
data/trash/<projectId>-<date>/             projets supprimés (corbeille, pas d'effacement immédiat)
```

| Route | Rôle |
|---|---|
| `GET /api/projects` | liste (id, nom, mise à jour, nombre de pages) |
| `POST /api/projects` | création (vierge ou depuis un modèle), id généré par le serveur |
| `GET/PUT /api/projects/:id` | lecture, écriture avec `If-Match` (inchangé par rapport au jalon 1) |
| `POST /api/projects/:id/duplicate` | copie du dossier, nouvel id, nouveaux ids de projet seulement |
| `DELETE /api/projects/:id` | déplacement vers la corbeille ; confirmation dans l'UI |
| `POST /api/projects/:id/media` | import d'un média dans le projet |
| `GET /api/projects/:id/archive` | archive `site.json` + `media/` (SB-12) ; `POST /api/projects/import` à l'inverse |
| `GET /media/:projectId/<file>` | service des médias pendant l'édition |

Les gardes du jalon 1 sont conservées : ids validés par regex, chemins vérifiés sous la racine,
en-tête `X-NS-Request`, contrôle d'origine, écoute locale uniquement. Les comptes et
organisations futurs s'ajouteront comme un préfixe (`<orgId>/<projectId>`) dans l'adaptateur, sans
toucher au modèle.

Les documents `data/documents/*.json` du jalon 1 sont proposés à l'import (migration v1 → v2) ; pas
de conversion automatique au démarrage.

### 4.5 Médiathèque et optimisation (ADR-0010 : optimisation au build par `astro:assets`, retenue à la place de `sharp` à l'import)

- `Asset` devient une union : `image` (raster), `svg`, `file` (téléchargeable : PDF, DOCX, ZIP…
  sur liste blanche), avec `name`, `alt` par défaut, `tags`, `createdAt`. L'`alt` d'une image reste
  surchargeable par composant (le texte alternatif dépend du contexte).
- **SVG** [R] : accepté seulement s'il passe une vérification stricte par **refus** (pas de
  réécriture) : pas de `<script>`, `<foreignObject>`, d'attribut `on*`, d'URL `javascript:`, de
  référence externe ni d'entité DOCTYPE ; rendu exclusivement via `<img>` (aucun script n'y est
  exécuté) ; servi avec `Content-Security-Policy: default-src 'none'` et `nosniff`. Jamais
  inséré en ligne dans le DOM.
- **Variantes responsives** : générées **à l'import** (largeurs 480, 960, 1600 px, et l'original
  si plus petit, en WebP) dans `media/.derived/`, et référencées par `srcset`/`sizes` **dans la vue**.
  Le canvas et l'export ont donc le même DOM (ADR-0002). L'original est toujours conservé.
  [O] Outil : `sharp` (Apache-2.0, déjà dépendance optionnelle d'Astro) côté serveur de
  développement. Alternative : `astro:assets` au build de l'export, mais il est inutilisable depuis
  une vue React et rendrait le DOM du canvas différent de celui de l'export.
- `loading="lazy"` par défaut, sauf les images marquées prioritaires (premier écran) qui reçoivent
  `eager` + `fetchpriority="high"`.
- Contrôles : média manquant (fichier absent), média inutilisé (avertissement), image sans `alt`
  non décorative (erreur).

### 4.6 Composants enrichis et JavaScript

| Composant | Rendu | JS |
|---|---|---|
| Logo | image + lien vers l'accueil (preset) | non |
| Navigation | `<nav>` + `<details>` mobile | non (îlot optionnel) |
| Liste de liens | `<ul>` de liens | non |
| Carte, CTA | presets de conteneurs existants | non |
| Galerie | grille d'images, légendes `<figure>` | non (lightbox hors jalon) |
| Vidéo | fichier local (`<video controls>`) ou YouTube/Vimeo en façade (vignette + lien), iframe `youtube-nocookie` chargée au clic | îlot minimal ; sans JS, lien vers la vidéo |
| Icône | jeu d'icônes intégré (sous-ensemble Lucide, ISC) rendu en SVG inline depuis des données du **registre**, jamais du document | non |
| Accordéon | `<details>/<summary>` | non |
| Onglets | ARIA tabs | îlot minimal ; sans JS, panneaux affichés les uns sous les autres avec leurs titres |
| Formulaire | apparence seule, `action` vide signalée | non |

Îlots JS [R] : un script par composant interactif, en module vanilla de quelques dizaines de
lignes, inclus **uniquement** dans les pages qui utilisent le composant, et copié tel quel dans
l'export (`src/scripts/`). Le canvas exécute les mêmes scripts, ce qui exige que le banc de fidélité
compare aussi l'état initial des composants interactifs. ADR-0002 (« îlots ciblés ») à compléter en
tranche 6.

### 4.7 Aperçu du site (SB-09)

[R] Une route du serveur de développement `GET /preview/:projectId/<slug>` rend la page complète
côté serveur (`react-dom/server`, mêmes vues, même `toCss`), médias et îlots compris, et s'ouvre
dans un nouvel onglet. Les liens internes y sont de vrais liens, les menus et le responsive se
testent naturellement, sans aucun outil d'édition. Le canvas, lui, reste l'éditeur d'une page ; un
clic sur un lien interne n'y navigue pas.

Alternative écartée : naviguer dans le canvas en interceptant les clics. C'est plus de code dans le
canvas, et on n'obtient pas une URL partageable entre onglets.

### 4.8 SEO, contrôles et export complet

- `Seo = { title?, description?, canonical?, index: boolean, image?: AssetId }` par page ; à
  défaut, titre de la page + nom du site, image par défaut du site.
- Export Astro [R] :

```text
src/pages/index.astro, src/pages/<slug>.astro, src/pages/404.astro   une page par fichier, lisible
src/layouts/Site.astro            <html lang>, <head> (titre, meta, OG, canonical), header, footer
src/parts/Header.tsx, Footer.tsx  compositions partagées (même génération JSX que les pages)
src/pages-content/<Page>.tsx      composition de chaque page
src/components/*.tsx              vues utilisées (copie verbatim, inchangé)
src/scripts/*.js                  îlots utilisés
src/styles/site.css               base, tokens, composants, layouts ; <page>.css par page
public/media/…                    médias utilisés et variantes
public/robots.txt, public/sitemap.xml   générés par le Studio (URLs connues, baseUrl requis)
redirects/                        _redirects (Netlify/Cloudflare), nginx.conf, .htaccess + README
README.md, MEDIA.md               installation, structure, déploiement, inventaire des médias
```

  Le sitemap est généré directement : la liste des URLs est connue, une intégration
  `@astrojs/sitemap` ajouterait une dépendance pour rien. Les redirections passent aussi par la
  configuration `redirects` d'Astro, ce qui produit des pages `meta refresh` pour le statique.
- `checkSite(site): Diagnostic[]` avec `severity: 'error' | 'warning'` : validation du modèle,
  liens internes cassés, médias manquants, slugs dupliqués, titre ou description manquants,
  `baseUrl` absent (bloquant pour le sitemap), page d'accueil non publiée, `alt` manquant,
  titres sautant un niveau, contraste texte/fond calculable sur les tokens. Les erreurs bloquent
  l'export, les avertissements sont affichés.
- **Build statique** : le Studio lance `npm ci && npm run build` dans le dossier exporté et
  produit `dist/` à côté des sources, avec une archive ZIP de chacun. Les contrôles axe-core
  s'exécutent dans le banc (Playwright, dépendance de test) et non dans le Studio.

## 5. Interface du Studio

```text
Écran Projets      liste, créer, ouvrir, dupliquer, supprimer (confirmation), importer
Éditeur            barre : projet ▸ page (sélecteur), viewport, aperçu du site, enregistrer, exporter
  panneau gauche   onglets : Pages (+ Header/Footer) · Calques · Ajouter · Médias
  panneau droit    Inspecteur (nœud) · Page (slug, SEO, publication) quand rien n'est sélectionné
  dialogues        Design system, Menus, Paramètres du projet, Contrôles avant export
URL                #/projects · #/p/<projectId>/<pageId|layoutId>
```

L'historique couvre tout le site et la sélection inclut la page courante : annuler un changement de
page restaure aussi la page affichée.

## 6. Sécurité (compléments au jalon 1)

- SVG : politique §4.5 ; fichiers téléchargeables sur liste blanche de types, signature vérifiée,
  servis avec `Content-Disposition: attachment`.
- Vidéo : fournisseurs sur liste blanche (YouTube, Vimeo), id extrait et validé ; aucune URL
  d'iframe libre.
- Polices : fichiers WOFF2 vérifiés par signature ; noms de familles sur liste blanche de
  caractères (injection CSS).
- Archives : import ZIP avec contrôle des chemins (zip slip), de la taille décompressée et du
  nombre d'entrées ; `site.json` passe par `loadSite`.
- Aperçu : servi par le serveur de développement local uniquement, en-têtes CSP stricts.
- Export : aucun secret, aucune route d'API, JS limité aux îlots utilisés.

## 7. Dépendances envisagées

| Dépendance | Usage | Décision |
|---|---|---|
| `sharp` | variantes d'images à l'import | [O] ADR tranche 5 ; alternative : aucune optimisation au jalon |
| `fflate` (MIT) | archives ZIP d'import et d'export | [O] alternative : dossier non compressé |
| Lucide (sous-ensemble, ISC) | icônes | données copiées dans le registre, pas de dépendance npm |
| `@astrojs/sitemap` | — | rejeté (§4.8) |

## 8. Risques

| Id | Risque | Prob. | Impact | Réponse |
|---|---|---|---|---|
| R12 | Migration v1 → v2 qui casse le banc et la démo du jalon 1 | M | É | Tranche 1 dédiée, critère : banc 20/20 et démo inchangés |
| R13 | Fidélité des tokens responsifs (variables redéfinies en media query) | M | M | Fixture dédiée au banc dès la tranche 3 |
| R14 | Fidélité des îlots JS (état initial différent canvas/export) | M | M | Scripts identiques, état initial comparé par le banc |
| R15 | `site.json` volumineux, coût de l'envoi au canvas | F | M | Le canvas reçoit la page et ses layouts, pas tout le site ; mesure sur 20 pages |
| R16 | Build statique dépendant du réseau (`npm ci`) | É | F | Documenté ; cache npm local ; livrable « sources » toujours disponible |
| R17 | SVG malveillant | M | É | Refus strict, rendu `<img>` seulement, tests sur un corpus de SVG piégés |
| R18 | Explosion du périmètre UI (6 nouveaux panneaux) | É | M | Une tranche = un lot de la spec, démontrable seule |

## 9. Décomposition du jalon 2

| Tranche | Lots | Contenu | Acceptation |
|---|---|---|---|
| **1** | SB-A (modèle) | `ns.site` v2, migration v1 → v2, `loadSite`, liens `page`, commandes de nœuds sur le site + commandes de pages, `toCss(site, racines)`, `resolve(props, ctx)` ; le Studio édite une page d'un site ; export d'un site à une page | Tests de migration et de validation ; banc 20/20 et `npm run demo` inchangés ; e2e verts |
| **2** | SB-01, SB-02 | Adaptateur projets (ADR-0008), médias isolés, écran Projets, panneau Pages (ajout, renommage, duplication, suppression, ordre, accueil, slug, publication), liens vers une page, alerte de slug, archive | e2e : créer un projet de 3 pages liées, renommer un slug, recharger |
| **3** | SB-05 | Tokens, styles de texte, panneau Design system, sélecteur de token dans l'inspecteur | Un token modifié se répercute sur 3 pages ; fixture de banc tokens responsifs |
| **4** | SB-03, SB-04, SB-09 | Menus, composant `nav`, layouts header/footer, aperçu du site | Header et footer partagés sur 3 pages, menu responsive sans JS, aperçu navigable |
| **5** | SB-06 | Médiathèque (recherche, métadonnées, SVG, fichiers), variantes, contrôles médias | Corpus SVG piégés refusés ; `srcset` identique canvas/export |
| **6** | SB-07 | Composants enrichis, îlots JS | Accordéon et onglets accessibles au clavier, axe sans violation, dégradation sans JS testée |
| **7** | SB-08, SB-10–12 | SEO, `checkSite`, export multipage, sitemap, robots, 404, redirections, build statique, README et inventaire | Export construit hors dépôt et servi par un serveur statique quelconque |
| **8** | §6 | Démonstration 5 pages (`npm run demo:site`), banc multipage, limites, bilan | Definition of Done §7 de la spécification |

Ordre imposé par les dépendances : 1 → 2 → (3 ∥ 5) → 4 → 6 → 7 → 8. Les tranches 3 et 5 touchent des
fichiers disjoints (`style/` et `tokens` d'une part, `assets` et le serveur de médias d'autre part)
et peuvent être menées en parallèle une fois le schéma v2 gelé.

## 10. Première tranche proposée

**Objectif :** faire passer tout le jalon 1 sur le modèle de site sans régression, avant d'ajouter
la moindre interface. C'est le même principe que la tranche 1 du jalon 1 : dérisquer le contrat
central d'abord.

1. `core/document/schema.ts` : `ns.site` v2 (réglages, pages), `linkSchema` étendu. Layouts, menus,
   tokens, SEO et redirections s'ajouteront dans leurs tranches comme champs **optionnels** de la
   v2, donc sans migration.
2. `core/document/migrate.ts` : migrations séquentielles, `1 → 2`.
3. `core/document/load.ts` : `loadSite` (version → migration → schéma → sémantique), validation multi-racines,
   slugs, références de pages ; `loadDocument` supprimé et ses appelants migrés.
4. Commandes : `PageDocument` remplacé par `Site` ; commandes de pages (`createPage`, `updatePage`,
   `removePage`, `movePage`, `duplicatePage`, `setHomePage`), tests.
5. `toCss(site, roots)`, `resolve(props, ctx)`, protocole `render { site, pageId }`.
6. Studio, dev-server et export adaptés au site, avec une page courante. Pas de nouvel écran ; la
   persistance reste celle du jalon 1, en stockant un `ns.site`.

**Acceptation :** `npm run check`, `test:e2e`, `test:fidelity` (fixtures v1 migrées) et `demo` verts ;
un document v1 sauvegardé au jalon 1 se rouvre ; une version future est refusée.

**Hors tranche :** projets, panneau Pages, tokens, menus, médias isolés.

## 11. Décisions à valider

1. **ADR-0007** : un seul `site.json` par projet, table de nœuds globale (vs un fichier par page).
2. **ADR-0008** : un dossier par projet, corbeille plutôt qu'un effacement immédiat.
3. Variantes d'images à l'import avec `sharp` (§4.5), à trancher au plus tard en tranche 5.
4. Îlots JS vanilla pour les onglets et la vidéo (§4.6), à trancher en tranche 6.
