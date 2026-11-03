# Tatsu : analyse fonctionnelle et technique

> Analyse du code de **Tatsu 3.5.3** (`oshin/plugins/tatsu`), éditeur de pages de Brand Exponents livré avec le thème **Oshin** (et ses plugins `oshine-core` et `oshine-modules`).
> Objectif : comprendre sa philosophie et ses fonctionnalités pour construire un équivalent indépendant de WordPress (CMS headless et/ou génération statique avec Astro).

---

## 1. Vue d'ensemble

Tatsu est un **éditeur visuel « front-end »** : on édite la page dans un aperçu fidèle du rendu final, avec un panneau latéral de réglages. On peut le résumer ainsi :

1. **Une arborescence stricte** : `Section > Row > Column > Module` (avec en plus `Inner Row > Inner Column`).
2. **Des modules entièrement déclaratifs** : chaque module est décrit par un *schéma* (attributs, types de champs, organisation du panneau, sélecteurs CSS, conditions d'affichage, presets). L'interface d'édition et le CSS sont **générés à partir de ce schéma**.
3. **Le CSS vient des données** : la plupart des réglages de style ne passent pas par des classes. Ils deviennent des règles CSS limitées à l'instance (`.tatsu-{UUID} …`) et déclinées par breakpoint.
4. **Des systèmes de design globaux** : palette de couleurs globale (Colorhub) et typographie globale (Typehub), référencées par les modules.
5. **De la réutilisation à plusieurs niveaux** : presets de module, « concepts » de section, templates de page, sections globales, header/footer builder.

| Couche | Technologie dans Tatsu |
|---|---|
| Éditeur (UI) | React 15 (`createClass`) + Redux + **Immutable.js** + react-dnd + Sortable + TinyMCE + CodeMirror + react-color, packagé avec webpack (`builder/js/bundle.js`, 5,6 Mo) |
| Aperçu | `iframe` (`#tatsu-preview`) qui charge la vraie page WordPress avec `?tatsu-frame`, communication par `postMessage` (`builder/js/tatsu-frame.js`) |
| Stockage | Post WordPress : arbre JSON dans la meta `_tatsu_page_content` **et** shortcodes sérialisés dans `post_content` |
| Rendu | Fonctions PHP de shortcode (une par module) + CSS généré à la volée |
| Runtime front | jQuery + `public/js/tatsu.js` + librairies (Flickity, Isotope, Anime.js, Typed.js, Vivus, Magnific Popup…) |

---

## 2. Modèle de données

### 2.1 Arbre JSON (format d'édition)

Chaque nœud a la forme :

```json
{
  "name": "tatsu_button",
  "id": "…",
  "atts": {
    "key": "k3x9a1",
    "button_text": "Click Here",
    "bg_color": { "id": "palette:0", "color": "#e74c3c" },
    "padding": { "d": "20px 0px", "t": "10px 0px", "m": "5px 0px" },
    "content": "…"
  },
  "inner": [ /* enfants */ ]
}
```

- `key` : identifiant court en base36 (`be_uniqid_base36`), utilisé pour la classe CSS `tatsu-{key}`.
- **Valeurs responsives** : un objet indexé par breakpoint, `d` (desktop), `l` (laptop), `t` (tablet), `m` (mobile).
- **Couleurs** : soit une valeur brute, soit une référence à la palette globale (`palette:N` / `id` de couleur globale), résolue au rendu par `tatsu_get_color()`.
- `content` : contenu riche (HTML issu de TinyMCE) pour les modules texte.

### 2.2 Sérialisation en shortcodes

`tatsu_shortcodes_from_content()` (`includes/helpers/helpers.php:189`) convertit l'arbre en shortcodes imbriqués (`[tatsu_section …][tatsu_row …]…`). Les valeurs objet sont stockées en JSON dans l'attribut. L'opération inverse est faite par `Tatsu_Parser` (`includes/class-tatsu-content-parser.php`), qui **emballe automatiquement** le contenu « hors Tatsu » (HTML brut, modules isolés) dans `section > row > column > tatsu_text`. C'est ce qui permet de reprendre une page existante.

> 💡 **Pour la réécriture** : il suffit de garder l'arbre JSON, qui est la vraie source de vérité. Les shortcodes ne servent qu'à WordPress. On peut en revanche écrire un **convertisseur shortcodes → JSON** pour migrer les pages Oshin existantes (voir §12).

### 2.3 Autres données persistées

| Donnée | Stockage WP actuel |
|---|---|
| CSS / JS custom par page | metas `tatsu_custom_css`, `tatsu_custom_js` |
| Polices utilisées par la page | meta `tatsu_body_fonts` (pour charger uniquement les Google Fonts nécessaires) |
| Templates de page utilisateur | option / REST `save_template`, `get_template`, `delete_template` |
| Sections globales | CPT `tatsu_gsections` + option `tatsu_global_section_data` (règles de placement) |
| Headers / Footers | CPT `tatsu_header` / `tatsu_footer` |
| Formulaires | CPT `tatsu_forms` + meta `_tatsu_forms` (schéma des champs extrait de l'arbre) |
| Breakpoints | option `tatsu_ui_settings` (`laptop_max_width` 1377 px, `tablet_max_width` 1024 px par défaut) |
| Thème de l'UI | option `tatsu_ui_theme` (dark/light) |
| Révisions | révisions natives WP (21 dernières, paginées) |

---

## 3. Le schéma de module (le cœur du système)

Un module est enregistré par `tatsu_register_module( $tag, $options, $render_fn )` (`includes/helpers/api.php`). Exemple réduit tiré de `includes/modules/button.php` :

```php
$controls = array(
  'icon'          => '…/modules.svg#button',
  'title'         => 'Button',
  'type'          => 'single',      // single | multi (parent de sous-modules) | sub_module | core
  'child_module'  => '',            // ex. tatsu_tabs -> tatsu_tab
  'initial_children' => 1,          // enfants créés à l'insertion
  'hint'          => 'button_text', // attribut affiché comme libellé dans l'arbre
  'inline'        => true,          // édition inline possible dans l'aperçu
  'is_built_in'   => true,          // aperçu rendu côté client (template React)
  'is_dynamic'    => true,          // supporte les valeurs dynamiques
  'is_js_dependant' => false,       // relancer le JS front après rendu
  'group_atts'    => [ /* organisation du panneau : tabs > accordion > panel */ ],
  'atts'          => [ /* définition des champs */ ],
  'presets'       => [ 'default' => [ 'preset' => [ 'button_text' => 'Click Here', … ] ] ],
);
```

### 3.1 Définition d'un attribut

```php
array(
  'att_name'   => 'bg_color',
  'type'       => 'color',
  'label'      => 'Background Color',
  'default'    => '',
  'responsive' => true,                         // valeur par breakpoint
  'visible'    => array('url', '!=', ''),       // affichage conditionnel du champ
  'hidden'     => array('bg_image', '=', ''),
  'css'        => true,                         // génère du CSS
  'selectors'  => array(
    '.tatsu-{UUID} .tatsu-button' => array(
      'property' => 'background-color',
      'when'     => array( array('background_animation','!=','bg-animation-slide-left'), … ),
      'relation' => 'and',
      'append'   => 'px',                       // aussi : prepend, operation
    ),
  ),
)
```

Mécanismes à reproduire :

- **Conditions** (`visible`, `hidden`, `when`) : opérateurs `=`, `!=`, `notempty`, etc., combinables avec `relation: and|or`.
- **Sélecteurs multiples** par attribut, avec `{UUID}` remplacé par la clé d'instance.
- **Transformations de valeur** : `append`, `prepend`, `operation`.
- **Attributs communs** injectés dans tous les modules (`includes/class-tatsu-config.php`) : `hide_in` (masquer par device), `css_id`, `css_classes`, animation d'entrée (`animate`, `animation_type`, `animation_delay`, `animation_duration`), `padding`, `margin`, bordure (style, largeur, couleur, rayon), `box_shadow`. On peut les exclure par module avec `exclude`.
- **Remapping** (`tatsu_remap_modules`) : plusieurs tags (ex. `button`, `tatsu_button`) pointent vers la même définition, pour assurer la rétrocompatibilité.

### 3.2 Organisation du panneau (`group_atts`)

L'interface est décrite de façon déclarative avec des conteneurs imbriqués : `tabs` (styles `style1`/`style2`, avec icônes) > `tab` > `accordion` (panneaux ouverts par défaut via `active`) > `panel` > liste d'`att_name`. Les onglets standard sont **Content / Style / Advanced**, et à l'intérieur des couleurs on trouve souvent des sous-onglets **Normal / Hover**.

### 3.3 Types de champs (inventaire mesuré dans le code)

| Type | Usage | Occurrences |
|---|---|---|
| `color` | sélecteur de couleur + palette globale + alpha | 276 |
| `select` | liste déroulante | 121 |
| `text` | champ texte | 102 |
| `switch` | booléen | 96 |
| `input_group` | 4 valeurs (padding/margin/border-width : haut, droite, bas, gauche) | 90 |
| `button_group` | choix visuel (S/M/L, alignement…) | 80 |
| `slider` | curseur numérique avec unité | 66 |
| `number` / `negative_number` | numérique | 62 |
| `input_box_shadow` / `input_drop_shadow` | éditeur d'ombres | 31 |
| `single_image_picker` / `multi_image_picker` | médiathèque | 28 |
| `typography` | famille, graisse, taille, interligne, espacement, casse (lié à Typehub) | 15 |
| `screen_visibility` | masquer sur desktop/laptop/tablet/mobile | 13 |
| `tinymce` / `text_area` | texte riche / long | 19 |
| `icon_picker` / `svg_icon_picker` | bibliothèques d'icônes (Font Awesome, Tatsu icons, SVG) | 15 |
| *(spéciaux)* | dégradés, séparateurs de forme (shape dividers), modes de fusion, code (CodeMirror) | — |

> 💡 **Pour la réécriture** : ce catalogue de champs, plus le moteur de conditions, constituent l'essentiel de la « bibliothèque UI » à développer. Un schéma JSON/TypeScript équivalent (par exemple validé avec Zod) peut piloter à la fois l'éditeur, la génération du CSS et le typage des composants Astro.

---

## 4. Génération du CSS

Fonction `be_generate_css_from_atts()` (`includes/helpers/be-helpers.php:379`) :

1. Elle parcourt les attributs marqués `css: true`.
2. Si un attribut est `responsive`, sa valeur est un objet `{d,l,t,m}` et elle produit une règle par device.
3. Elle évalue les conditions `when` de chaque sélecteur, puis calcule `property: value` (avec append/prepend/operation).
4. Elle regroupe les règles par device et encapsule chaque groupe dans sa media query :
   - `l` : `@media (max-width: 1377px)`
   - `t` : `@media (min-width: 768px) and (max-width: 1024px)`
   - `m` : `@media (max-width: 767px)`
5. Elle émet un `<style>` par instance (balise `custom_style_tag`), et la classe `tatsu-{key}` est ajoutée au markup.

Le **même calcul existe côté éditeur**, en JavaScript, pour mettre à jour l'aperçu en temps réel sans aller-retour serveur.

> 💡 **Pour Astro** : une seule fonction TypeScript `generateCss(schema, atts, key)`, partagée entre l'éditeur et le build, suffit. Au build, on concatène le CSS de toute la page dans un seul fichier, plutôt que d'émettre un `<style>` par module.

---

## 5. L'éditeur : fonctionnalités UI

### 5.1 Structure de l'écran
- **Aperçu iframe** de la vraie page, avec sélection au survol ou au clic (outlines, poignées), et **édition inline** des textes pour les modules `inline: true` ou les champs `is_inline`.
- **Panneau latéral de réglages** généré à partir du schéma (`group_atts`).
- **Panneau d'ajout de modules** : catégories (`tatsu_module_categories`, filtrable), recherche, icônes SVG.
- **Vue arborescente** (« Birds Eye View », composants `BirdsEyeViewList/Block`) : structure de la page en arbre, réordonnable par glisser-déposer.
- **Bascule responsive** (`ResponsiveToggle`) : Desktop / Laptop / Tablet / Mobile. L'aperçu se redimensionne et les champs `responsive` éditent la valeur du device actif.
- Thème clair ou sombre de l'interface. L'état des panneaux est mémorisé dans `localStorage` (`tatsuEditorState`).

### 5.2 Manipulation des éléments
- **Glisser-déposer** (react-dnd + Sortable) de sections, rangées, colonnes et modules.
- **Menu contextuel** (clic droit), adapté au type d'élément :
  - Couper `⌘X`, Copier `⌘C`, Coller `⌘V`, Supprimer `⌘⌫`, Dupliquer `⌘D`
  - **Copier / Coller les styles** `⌘⇧C` / `⌘⇧V` (on transfère uniquement les attributs de style d'un module à un autre du même type)
  - Ajouter une section ou une rangée, ajouter un module, **Gérer les colonnes** (choix de layout : 1/1, 1/2+1/2, 1/3+2/3…), éditer
  - **Enregistrer comme template** (sur une section)
- **Annuler / Rétablir** (historique d'états Immutable).
- **Collage de shortcodes** (`ajax_paste_shortcode`), qui convertit du texte shortcode en modules.

### 5.3 Page et publication
- **Enregistrer** (brouillon) / **Publier** selon les droits de l'utilisateur.
- **Révisions** : liste horodatée avec auteur, chargement et restauration d'une révision (`ajax_get_revision_content`).
- **CSS et JS custom par page** (éditeur CodeMirror).
- **Global Settings** : réglages globaux (breakpoints, couleurs, typo) accessibles depuis l'éditeur.
- **Templates** : modal (`TemplatesModal`) avec templates prédéfinis et templates utilisateur (« Save Page as Template », « Saved Templates »), suppression.

### 5.4 Rendu de l'aperçu
- Modules **built-in** : rendus côté client par des templates React intégrés au bundle, donc mise à jour instantanée.
- Modules **tiers** (ex. ceux d'`oshine-modules`) : rendus côté serveur via l'AJAX `tatsu_module` (le serveur exécute le shortcode et renvoie le HTML), avec placeholder et loader pendant la requête.
- `is_js_dependant` : après rendu, l'iframe relance le JS front du module (`tatsu_scripts_trigger` dans `tatsu-frame.js`) pour les carrousels, onglets, animations, etc.

---

## 6. Structure et mise en page

### Section (`modules/section.php`)
Fond : couleur, image (repeat, attachment, position et size, tous responsives), **dégradé**, **vidéo** (mp4, ogg, webm, preload), **animation de fond / parallaxe**. **Overlay** de couleur avec mode de fusion. Hauteur (auto, plein écran, personnalisée) et alignement vertical. **Séparateurs de forme** haut et bas (`tatsu_get_shape_dividers`, avec z-index). Padding et margin responsives. ID et classe, titre de section (utilisé pour l'ancrage et la navigation one-page), offset, schéma de couleur du header transparent (`full_screen_header_scheme`), overflow.

### Row (`modules/row.php`)
Layout de colonnes, `full_width`, **gouttière** (gutter), **colonnes de hauteur égale**, colonnes plein écran, **inversion de l'ordre des colonnes** (`swap_cols`, pour le mobile).

### Column (`modules/column.php`)
Largeur (responsive), fond complet (comme la section), bordure, rayon, ombres (normale et hover), **effets au survol** (colonne et image), overlay animé, **colonne cliquable** (`link_overlay`), **colonne sticky**, **parallaxe de colonne**, **tilt**, espacement mobile, séparateurs gauche et droite.

---

## 7. Catalogue de modules

### Tatsu (natifs, `includes/modules/`)
- **Texte** : `text`, `inline_text`, `simple_text`, `text_with_shortcodes`, `special_heading`, `animated_heading`, `typed_text`, `dropcap` / `dropcap2`, `code`.
- **Boutons et liens** : `button`, `gradient_button`, `button_group`, `animated_link`, `call_to_action`.
- **Médias** : `single_image`, `multi_layer_image`, `gallery`, `image_carousel`, `video`, `gmaps`, `rev_slider`.
- **Icônes** : `icon`, `gradient_icon`, `svg_icon`, `icon_group`, `icon_card`, `title_icon`.
- **Contenu structuré** : `tabs`/`tab`, `accordion`/`toggle`, `lists`/`list`, `process`, `skills`, `animated_numbers`, `star_rating`, `team`, `testimonial`, `testimonial_carousel`, `interactive_box`, `notifications`.
- **Mise en page** : `divider`, `empty_space`, `sidebar`.
- **Formulaires** : `tatsu_forms` (builder de formulaires natif), `wp_forms`.
- **Sections globales** : `gsection_title`, `gsection_meta` (titre et métadonnées dynamiques de l'article courant).

### Oshine Modules (`oshine-modules`, propres au thème)
Portfolio (grille, carrousel, fancy portfolio, navigation, détails projet), blog et articles récents, sliders (be_slider, flex, content slides), galerie justifiée, clients, pricing, services, menu card, countdown, chart, newsletter, contact form, marquee, tweets, special headings 1 à 6, icônes animées, etc. (environ 45 modules).

### Header / Footer builder (`includes/header-builder/modules/`)
`header_row`, `header_column`, `logo`, `nav_menu`, `sidebar_nav_menu`, `hamburger_menu` + `slide_menu_column`, `header_links`, `header_search`, `header_cart` (WooCommerce), `header_divider`, `language_switcher` (WPML), et le bouton. Ils sont édités avec le même éditeur (stores dédiés `header_store` et `footer_store`), avec la gestion des **headers transparents ou sticky** et des schémas clair/sombre (`light_*` / `dark_*` sur les modules).

---

## 8. Réutilisation et contenus globaux

| Fonction | Description | Fichiers |
|---|---|---|
| **Presets de module** | Valeurs par défaut à l'insertion d'un module ; un module peut en avoir plusieurs (avec vignette) | clé `presets` des modules |
| **Section concepts** | Bibliothèque de sections préconçues (hero, CTA, features…) avec vignette, insérables en un clic | `includes/concepts/section-concepts.php`, `templates/website-templates/{hero,cta,features,pricing,team,testimonials,contact,clients,content}` |
| **Header / footer concepts** | 9 headers et 5 footers préconçus | `header-builder/concepts`, `footer-builder/concepts` |
| **Templates de page** | Pages complètes prédéfinies et templates enregistrés par l'utilisateur | `rest_api/class-tatsu-page-templates.php` |
| **Sections globales** | Blocs réutilisables injectés automatiquement en position `top`, `penultimate` ou `bottom`, selon des règles par type de contenu (`single-post`, `archive-portfolio`, `all`…) ou forcés par page | `public/class-tatsu-public.php:476` |
| **Démo import** | Import de sites de démonstration complets | `includes/demo-import` |

---

## 9. Systèmes de design globaux

### Colorhub
- **Palette de 5 couleurs** (accent, accent twin…) et **swatches** nommés.
- Les modules stockent des **références** (`palette:0`) et non des valeurs : si on change la palette, tout le site suit.
- API : `tatsu_register_color`, `tatsu_register_color_picker_default`, `tatsu_get_color`.

### Typehub
- **Styles typographiques nommés** liés à des sélecteurs (`h1`…`h6`, body, etc.), responsives, avec famille, graisse, taille, casse, interlettrage et interligne.
- **Schémas de polices** (`scheme:primary`, `scheme:secondary`) : on change une famille à un seul endroit.
- Sources de polices : Google Fonts (liste embarquée), Adobe Typekit (synchronisation), **polices locales et custom** (upload, téléchargement local des Google Fonts).

> 💡 Ces deux systèmes correspondent directement à des **design tokens** (variables CSS `--color-accent`, `--font-primary`, etc.). Dans la nouvelle version, il vaut mieux générer des custom properties CSS que de résoudre les valeurs dans chaque règle.

---

## 10. Contenus dynamiques et formulaires

- **Valeurs dynamiques** (`tatsu_get_dynamic_values`, `tatsu_parse_custom_fields`) : certains champs (URL, texte…) peuvent être liés à un champ ACF, à une meta ou à une fonction WP (titre, date, auteur…). C'est la brique « CMS » du builder (une partie est réservée à la version Pro).
- **Tatsu Forms** : formulaires construits en modules (`spyro_form_field`). Le schéma des champs est extrait à la sauvegarde, la soumission se fait en AJAX avec reCAPTCHA, l'envoi d'email utilise des **tags** (`{field_name}`), il y a un **auto-répondeur**, les entrées sont stockées et listées dans l'admin (`class-tatsu-forms-table.php`), avec des options RGPD.

> 💡 En mode headless ou Astro : les valeurs dynamiques deviennent des **bindings vers les champs du CMS** (par exemple `{{ entry.title }}`), et les formulaires deviennent un endpoint (fonction serverless, Formspree, ou API du CMS).

---

## 11. Runtime front (`public/js/tatsu.js`)

Comportements à réimplémenter (de préférence en JS natif ou en *islands* Astro, sans jQuery) :

- Animations d'entrée au scroll (`cssAnimate`, liste `tatsu_css_animations`), animation des titres (Anime.js), texte tapé (Typed.js), dessin de SVG (Vivus), animation de lignes.
- Compteurs animés, barres de progression (skills).
- Carrousels et sliders (Flickity), grilles et masonry (Isotope), galeries.
- Lightbox image et vidéo (Magnific Popup), vidéos YouTube/Vimeo responsives (fitvids), vidéos de fond.
- Parallaxe de section et de colonne, **tilt** de colonne, **colonnes sticky**.
- Lazy-load des images et des fonds.
- Onglets, accordéons, timeline de listes, notifications fermables, Google Maps (styles custom).
- Ancres animées (scroll fluide), header sticky ou transparent (`tatsu-header.js`).

Le JS est appelé par module (`registerCallbacks`) et peut être relancé pour un module précis (`shouldUpdate, moduleId`), ce qui sert à l'aperçu dans l'éditeur.

---

## 12. API d'extension (à conserver dans l'esprit)

```text
tatsu_register_module / tatsu_deregister_module / tatsu_remap_modules
tatsu_register_global_module
tatsu_register_header_module / tatsu_register_footer_module
tatsu_register_section_concept / tatsu_register_header_concept / tatsu_register_footer_concept
tatsu_register_template
tatsu_register_color / tatsu_register_color_picker_default
tatsu_register_icon_kit / tatsu_register_svg
tatsu_register_global_section_meta
filtres : tatsu_module_categories, {module}_before_css_generation, tatsu_get_dynamic_values, tatsu_section_classes…
```

La philosophie est de **tout enregistrer par code**, de façon déclarative, pour qu'un thème ou un plugin puisse ajouter des modules sans toucher à l'éditeur. Dans la nouvelle version, l'équivalent est un **registre de composants** : un fichier `schema.ts` plus un composant `.astro` par module.

---

## 13. Proposition de transposition (Astro / headless)

| Concept Tatsu | Équivalent proposé |
|---|---|
| Arbre JSON dans une meta WP | Document JSON versionné (fichier dans le repo, Content Collection Astro, ou champ JSON d'un CMS headless : Payload, Directus, Strapi, Sanity…) |
| Schéma PHP de module | `schema.ts` typé (Zod) : atts, groupes UI, sélecteurs CSS, conditions, presets |
| Fonction PHP de rendu (shortcode) | Composant `.astro` (rendu statique, sans JS par défaut) |
| Template React d'aperçu | Le **même composant** rendu dans l'aperçu (serveur de dev Astro ou SSR) : un seul template au lieu de deux (PHP et React) |
| `be_generate_css_from_atts` | `generateCss()` TS partagé entre l'éditeur et le build, avec un CSS consolidé par page |
| Colorhub / Typehub | Design tokens → variables CSS globales |
| Runtime jQuery | Scripts natifs par module, chargés seulement si le module est présent (islands ou `<script>` scopés Astro) |
| Sections globales / header / footer | Layouts Astro + documents « partials » avec des règles de placement |
| Révisions WP | Historique git, ou versions du CMS |
| Valeurs dynamiques ACF | Bindings vers les champs du CMS headless |
| Tatsu Forms | Schéma de formulaire + endpoint serverless |
| Éditeur React/Redux/Immutable | Éditeur moderne (React ou Svelte + store immuable comme Immer/Zustand, dnd-kit, Tiptap pour le texte riche, Monaco/CodeMirror 6) avec aperçu iframe et `postMessage` |

### Points d'attention
- **Migration** : écrire un parseur `[shortcode …]` → arbre JSON (le format est régulier ; les attributs objets sont du JSON entre apostrophes) pour récupérer les pages Oshin existantes. Les modules `oshine-modules` (portfolio, blog…) dépendent de requêtes WP et devront être remplacés par des requêtes au CMS.
- **Double rendu** : Tatsu maintient deux implémentations par module (PHP pour le front, React pour l'aperçu), ce qui cause des divergences. Utiliser un seul composant pour les deux est le principal gain architectural.
- **CSS inline par instance** : à remplacer par un CSS par page, dédupliqué.
- **Dépendances front lourdes** (jQuery, Isotope, Flickity…) : à remplacer par des équivalents légers ou natifs (CSS scroll-snap, `IntersectionObserver`, `<dialog>`).
- **Périmètre minimal viable** : section/row/column + environ 10 modules (texte, titre, image, bouton, icône, vidéo, divider/spacer, onglets/accordéon, galerie, formulaire), les champs principaux (text, color, select, switch, slider, input_group, image, typography, responsive) et le moteur de conditions et de CSS. Le reste se construit ensuite en ajoutant des schémas.

---

## 14. Fichiers de référence

| Sujet | Fichier |
|---|---|
| Bootstrap du plugin | `oshin/plugins/tatsu/includes/class-tatsu.php` |
| API d'enregistrement | `includes/helpers/api.php` |
| Attributs communs | `includes/class-tatsu-config.php` |
| Exemple de module complet | `includes/modules/button.php` |
| Section / Row / Column | `includes/modules/section.php`, `row.php`, `column.php` |
| Génération CSS | `includes/helpers/be-helpers.php:379` |
| Sérialisation JSON → shortcodes | `includes/helpers/helpers.php:189` |
| Parseur shortcodes → JSON | `includes/class-tatsu-content-parser.php` |
| Endpoints REST | `includes/rest_api/class-tatsu-rest-api.php` |
| Sauvegarde | `includes/rest_api/class-tatsu-store.php`, `class-tatsu-page-content.php` |
| Bootstrap de l'éditeur | `builder/class-tatsu-builder.php` |
| UI de l'éditeur (compilée) | `builder/js/bundle.js` (menu contextuel et raccourcis vers la ligne 32858) |
| Pont iframe | `builder/js/tatsu-frame.js` |
| Runtime front | `public/js/tatsu.js` |
| Sections globales | `public/class-tatsu-public.php:476` |
| Typographie / couleurs | `includes/typehub/`, `includes/colorhub/` |

---

## 15. Licences et provenance des fonctionnalités

> Cette section est un constat technique fait à partir des fichiers présents. Ce n'est pas un avis juridique.

### 15.1 Licences constatées

| Composant | Licence déclarée | Fichier de licence | Exceptions et réserves |
|---|---|---|---|
| **Tatsu 3.5.3** | GPL-2.0+ (en-tête de `tatsu.php`) | `LICENSE.txt` (GPLv2) | voir ci-dessous |
| ├ Typehub / Colorhub (embarqués) | GPLv2 | `includes/typehub/LICENSE.txt`, `includes/colorhub/LICENSE.txt` | — |
| ├ plugin-update-checker | MIT | `plugin-update-checker/license.txt` | — |
| ├ Flickity, Isotope | **GPLv3 ou licence commerciale Metafizzy** | en-têtes JS | GPLv3 combinable avec du GPL-2.0+, mais l'ensemble distribué devient de fait GPLv3 |
| ├ Anime, Typed, Vivus, imagesLoaded, unveil… | MIT / WTFPL | en-têtes JS | — |
| ├ Magnific Popup, tatsuCarousel, tilt, begrid, parallax… | aucune mention | — | provenance à confirmer |
| ├ Font Awesome 4.7 et Free 6.4.2 | OFL 1.1 (police), MIT (CSS), CC BY 4.0 (icônes v6) | en-têtes CSS | attribution requise |
| ├ Linea (SVG) | aucune mention dans le code | — | jeu d'icônes tiers (Linea est en principe CC BY 4.0, à confirmer) |
| ├ tatsu-icons | aucune mention | — | police générée avec IcoMoon, origine des glyphes inconnue |
| └ Images (concepts, templates, démos `demo-files/*.xml`) | **aucune** | — | probablement des photos de banques d'images : **à considérer comme non réutilisables** |
| **Oshine Modules 3.4.3** | GPL-2.0+ | `LICENSE.txt` (GPLv2) | contient Isotope (GPLv3), Owl Carousel, beslider, etc. |
| **Oshine Core 1.6.3** | « GPL2 or later » (en-tête) | **absent** | — |
| **Thème Oshin 7.3.2** | « GPL 2.0 » (en-tête `style.css`) | `license.txt` référencé mais **absent** | vendu sur ThemeForest ; contient **GreenSock 1.13 (« All rights reserved », licence propriétaire GreenSock)**, ReduxFramework (GPL), meta-box (GPL), Flickity et Isotope (GPLv3) |

**Conclusions :**
- **La GPL ne couvre pas tout le contenu du plugin Tatsu.** Elle couvre le code PHP et JS écrit par Brand Exponents (dont Typehub et Colorhub). Les librairies tierces gardent leur propre licence (compatible dans la plupart des cas). Les **médias** (vignettes et photos des concepts, templates et démos) n'ont aucune licence déclarée.
- `README.txt` de Tatsu est le modèle WordPress par défaut, laissé vide (« Here is a short description of the plugin… »). Il n'apporte aucune information sur la licence.
- Pour le thème, ThemeForest applique souvent une **licence scindée** : PHP sous GPL, CSS, JS et images sous licence Envato. Je n'ai pas pu vérifier quelle option Brand Exponents a choisie pour Oshin : c'est à vérifier dans la section « License » de la fiche ThemeForest.
- Les fonctionnalités « Pro » (`is_tatsu_authorized`, plugin `tatsu-pro`) sont un produit séparé qui **n'est pas présent** dans ce dossier.

**Conséquences pour le projet :**
- Une **réimplémentation sans copie de code** (« clean room ») n'hérite pas de la GPL. Les idées, les fonctionnalités et le format de données ne sont pas protégés par le droit d'auteur.
- Reprendre du **code ou des ressources** (CSS de grille, SVG des séparateurs de forme, templates de sections, icônes) impose la licence de ces éléments : GPL si l'outil est distribué, attribution pour CC BY. Les photos et le contenu des démos sont à exclure.
- Ne pas utiliser les **marques** « Tatsu », « Oshin » ou « Oshine ».

### 15.2 Ce qui vient de Tatsu et ce qui vient d'Oshin

| Fonctionnalité (sections du document) | Origine | Éléments de preuve |
|---|---|---|
| Hiérarchie Section / Row / Column / Inner (§6), grille et CSS de layout | **Tatsu seul** | `includes/modules/{section,row,column}.php` ne font aucune référence à Oshin ; la grille est dans `tatsu/public/css/tatsu.css` ; `oshin/css/main.css` ne touche qu'environ 6 classes `tatsu-*` (`tatsu-column-empty`, `tatsu-section-pad`…) |
| Schéma de module, champs, conditions, génération CSS, responsive (§3, §4) | **Tatsu seul** | `helpers/api.php`, `be-helpers.php` |
| Éditeur : glisser-déposer, arbre, menu contextuel, undo/redo, révisions, templates (§5) | **Tatsu seul** | `builder/` |
| Typehub / Colorhub (§9) | **Moteur Tatsu**, *contenu* fourni par le thème | Oshin déclare ses styles typo (`oshin/functions/typehub-options-config.php`) et ses polices ; `oshine-modules` déclare des couleurs (`tatsu_register_colors`) |
| Header builder, footer builder, sections globales (§7, §8) | **Moteur Tatsu**, *activation* par le thème | Oshin appelle `add_theme_support('tatsu-global-sections')` systématiquement, et `tatsu-header-builder` / `tatsu-footer-builder` selon ses options (`oshin/functions.php:62-69`). Sans thème partenaire, Tatsu passe en mode « standalone » et injecte lui-même header et footer |
| Section concepts, templates, démos (§8) | **Tatsu**, avec une variante pour Oshin | si le thème est Oshin, les concepts utilisent la police d'icônes d'Oshin au lieu de tatsu-icons (`concepts/section-concepts.php:18`) |
| Modules natifs Tatsu (§7, première liste) | **Tatsu** | sauf `tatsu_animated_link` et `tatsu_skills`, **remplacés** par les versions d'Oshine quand le plugin est actif (`tatsu_remap_modules` dans `oshine-modules/…/animated_link.php`, `skills.php`) |
| Modules portfolio, blog, sliders, pricing, etc. (§7, deuxième liste) | **Oshine Modules** | ils sont affichés comme placeholders « PRO » dans Tatsu quand le thème n'est pas Oshin (`includes/modules/moduless.php`) |
| Header classique (non builder), templates de page (sidebar, splitscreen), blog et portfolio, options Redux | **Thème Oshin** | `themes/oshin/` |
| Oshine Core | **Oshin** : import de démos uniquement | en-tête de `oshine-core.php` |

**En résumé :** toutes les fonctionnalités de mise en page et d'édition décrites dans les §2 à §6 et §8 à §12 viennent **exclusivement de Tatsu**. Oshin intervient sur trois points : il **active** certaines briques (header/footer builder, sections globales), il **fournit des valeurs** (styles typo, couleurs, polices, icônes) et il **ajoute environ 45 modules métier** (`oshine-modules`). Pour migrer les sites existants, il faudra donc aussi reprendre les réglages typo et couleurs propres à Oshin, ainsi que le CSS de `oshin/css/main.css`, car le rendu final en dépend.
